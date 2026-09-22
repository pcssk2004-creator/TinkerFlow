/* =====================================================
   TINKERHUB SBCE EVENTOPS - FIREBASE BACKEND
   Firebase Authentication (PIN sign-in) + Firestore

   Collections
     users/{uid}      team profile (accountId, name, role)
     events/{id}      shared events
     duties/{id}      role duties (one document per duty)
     activity/{id}    activity log (Campus Lead + Head Coordinators)
     app/main         legacy single-document data (import only)
===================================================== */

(function () {
    'use strict';

    const firebaseConfig = {
        apiKey: "AIzaSyB0oZXnJKQUXOpxfF4Iy-yChF_ZGGxr15c",
        authDomain: "tinkerflow-e2577.firebaseapp.com",
        projectId: "tinkerflow-e2577",
        storageBucket: "tinkerflow-e2577.firebasestorage.app",
        messagingSenderId: "745405854246",
        appId: "1:745405854246:web:48ac12c183484e8396ece7"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();
    const FieldValue = firebase.firestore.FieldValue;
    const Timestamp = firebase.firestore.Timestamp;

    /*
        Firebase Auth needs an email + password. Each team account maps to a
        fixed internal email, and the PIN is turned into a password of at
        least 6 characters. Nothing is ever emailed to these addresses.
    */
    const EMAIL_DOMAIN = 'tinkerhub-sbce.app';
    const BATCH_SIZE = 10;

    let identity = null;

    const emailFor = id => `${id}@${EMAIL_DOMAIN}`;
    const secretFor = pin => `sbce-${pin}-tinkerhub`;
    const serverTime = () => FieldValue.serverTimestamp();
    const col = name => db.collection(name);

    function toMs(value) {
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (typeof value === 'number') return value;
        return null;
    }

    function clean(obj) {
        const out = {};
        Object.keys(obj).forEach(key => {
            if (obj[key] !== undefined) out[key] = obj[key];
        });
        return out;
    }

    function chunk(list, size) {
        const out = [];
        for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
        return out;
    }

    function normalize(doc) {
        const data = doc.data({ serverTimestamps: 'estimate' });
        ['createdAt', 'completedAt', 'timestamp'].forEach(key => {
            if (key in data) data[key] = toMs(data[key]);
        });
        return Object.assign({ id: doc.id }, data);
    }

    /* ---------- Batch helpers ---------- */

    async function commitGroup(group) {
        const batch = db.batch();
        group.forEach(op => op(batch));
        await batch.commit();
    }

    // All groups in parallel.
    async function commitOps(ops) {
        await Promise.all(chunk(ops, BATCH_SIZE).map(commitGroup));
    }

    // First group first (it holds the parent record), then the rest in parallel.
    async function commitOpsOrdered(ops) {
        const groups = chunk(ops, BATCH_SIZE);
        if (!groups.length) return;
        await commitGroup(groups[0]);
        await Promise.all(groups.slice(1).map(commitGroup));
    }

    function activityDoc(entry) {
        if (!identity) throw new Error('Not signed in.');
        return clean({
            userId: identity.id,
            userName: identity.name,
            role: identity.role,
            action: entry.action,
            detail: entry.detail ? String(entry.detail).slice(0, 250) : '',
            eventId: entry.eventId || undefined,
            eventName: entry.eventName ? String(entry.eventName).slice(0, 150) : undefined,
            timestamp: serverTime()
        });
    }

    /* ---------- Auth ---------- */

    function onAuthChanged(callback) {
        return auth.onAuthStateChanged(callback);
    }

    async function signIn(accountId, pin) {
        const cred = await auth.signInWithEmailAndPassword(emailFor(accountId), secretFor(pin));
        return cred.user;
    }

    async function getProfile(uid) {
        const snap = await col('users').doc(uid).get();
        return snap.exists ? snap.data() : null;
    }

    /*
        First-time setup: create the Auth account, prove the setup code,
        then create the profile. If anything is rejected the Auth account
        is removed again so nobody can squat on someone else's account.
    */
    async function setupAccount({ accountId, pin, name, role }) {
        let user;
        let created = true;

        try {
            const cred = await auth.createUserWithEmailAndPassword(emailFor(accountId), secretFor(pin));
            user = cred.user;
        } catch (err) {
            if (err.code !== 'auth/email-already-in-use') throw err;

            // Account exists. If the PIN matches, finish an interrupted setup or just sign in.
            try {
                const cred = await auth.signInWithEmailAndPassword(emailFor(accountId), secretFor(pin));
                user = cred.user;
            } catch (signInErr) {
                const e = new Error('Account already has a PIN.');
                e.code = 'setup/already-exists';
                throw e;
            }

            if (await getProfile(user.uid)) {
                return { user, created: false };
            }
        }

        try {
            await col('users').doc(user.uid).set({
                accountId,
                name,
                role,
                createdAt: serverTime()
            });
        } catch (err) {
            try {
                await user.delete();
            } catch (deleteErr) {
                await auth.signOut();
            }
            const e = new Error('Account setup failed.');
            e.code = (err && err.code) || 'setup/failed';
            throw e;
        }

        return { user, created };
    }

    async function changePin(currentPin, newPin) {
        const user = auth.currentUser;
        if (!user) throw new Error('Not signed in.');
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, secretFor(currentPin));
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(secretFor(newPin));
    }

    async function signOut() {
        await auth.signOut();
    }

    function authMessage(err, context) {
        const code = (err && err.code) || '';

        if (context === 'change' && (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/invalid-login-credentials')) {
            return 'Your current PIN is incorrect.';
        }

        switch (code) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
            case 'auth/invalid-login-credentials':
                return 'That PIN does not match, or this account has no PIN yet. New here? Choose "First time? Set your PIN".';
            case 'auth/too-many-requests':
                return 'Too many attempts. Wait a few minutes, then try again.';
            case 'auth/network-request-failed':
                return 'Cannot reach the server. Check your connection and try again.';
            case 'auth/operation-not-allowed':
                return 'Email/password sign-in is turned off. Enable it in Firebase Authentication.';
            case 'setup/already-exists':
                return 'This account already has a PIN. Log in with it, or ask the Campus Lead to reset the account.';
            case 'permission-denied':
                return 'Firestore denied the request. Publish the latest firestore.rules in the Firebase console.';
            default:
                return (err && err.message) || 'Something went wrong. Try again.';
        }
    }

    /* ---------- Identity for the activity log ---------- */

    function setIdentity(value) {
        identity = value;
    }

    /* ---------- Real-time listeners ---------- */

    function watch(query, onData, onError) {
        let first = true;

        return query.onSnapshot(
            snapshot => {
                const docs = snapshot.docs.map(normalize);
                const changes = snapshot.docChanges().map(change => ({
                    type: change.type,
                    doc: normalize(change.doc),
                    pending: change.doc.metadata.hasPendingWrites
                }));
                const initial = first;
                first = false;
                onData(docs, changes, initial);
            },
            err => {
                console.error('Firestore listener error:', err);
                if (onError) onError(err);
            }
        );
    }

    const watchEvents = (onData, onError) => watch(col('events'), onData, onError);
    const watchDuties = (onData, onError) => watch(col('duties'), onData, onError);
    const watchUsers = (onData, onError) => watch(col('users'), onData, onError);
    const watchActivity = (limit, onData, onError) =>
        watch(col('activity').orderBy('timestamp', 'desc').limit(limit), onData, onError);

    /* ---------- Writes ---------- */

    const newId = collectionName => col(collectionName).doc().id;

    async function logActivity(entry) {
        await col('activity').add(activityDoc(entry));
    }

    async function createEvent(eventId, event, duties, activity) {
        const ops = [];

        ops.push(batch => batch.set(col('events').doc(eventId), Object.assign({}, event, { createdAt: serverTime() })));
        ops.push(batch => batch.set(col('activity').doc(), activityDoc(activity)));

        duties.forEach(duty => {
            ops.push(batch => batch.set(col('duties').doc(), Object.assign({}, duty, { createdAt: serverTime() })));
        });

        await commitOpsOrdered(ops);
    }

    async function deleteEvent(eventId, activity) {
        const snapshot = await col('duties').where('eventId', '==', eventId).get();

        await commitOps(snapshot.docs.map(doc => batch => batch.delete(doc.ref)));

        await commitOps([
            batch => batch.delete(col('events').doc(eventId)),
            batch => batch.set(col('activity').doc(), activityDoc(activity))
        ]);
    }

    async function addDuty(duty, activity) {
        await commitOps([
            batch => batch.set(col('duties').doc(), Object.assign({}, duty, { createdAt: serverTime() })),
            batch => batch.set(col('activity').doc(), activityDoc(activity))
        ]);
    }

    async function setDutyCompleted(dutyId, completed, userId, activity) {
        await commitOps([
            batch => batch.update(col('duties').doc(dutyId), {
                completed: completed,
                completedAt: completed ? serverTime() : null,
                completedBy: completed ? userId : null
            }),
            batch => batch.set(col('activity').doc(), activityDoc(activity))
        ]);
    }

    async function updateDuty(dutyId, changes, activity) {
        await commitOps([
            batch => batch.update(col('duties').doc(dutyId), Object.assign({}, changes, { updatedAt: serverTime(), updatedBy: activity && activity.userId ? activity.userId : null })),
            batch => batch.set(col('activity').doc(), activityDoc(activity))
        ]);
    }

    async function deleteDuty(dutyId, activity) {
        await commitOps([
            batch => batch.delete(col('duties').doc(dutyId)),
            batch => batch.set(col('activity').doc(), activityDoc(activity))
        ]);
    }

    /* ---------- Legacy data (app/main) ---------- */

    async function readLegacy() {
        try {
            const snap = await col('app').doc('main').get();
            if (!snap.exists) return null;
            const data = snap.data() || {};
            return {
                events: Array.isArray(data.events) ? data.events : [],
                duties: Array.isArray(data.duties) ? data.duties : [],
                hasPins: !!(data.pins && typeof data.pins === 'object' && Object.keys(data.pins).length)
            };
        } catch (err) {
            return null;
        }
    }

    async function importLegacy(events, duties, activity) {
        const ops = [];

        events.forEach(e => {
            ops.push(batch => batch.set(col('events').doc(e.id), Object.assign({}, e.data, { legacy: true, createdAt: serverTime() })));
        });

        duties.forEach(d => {
            const data = Object.assign({}, d.data, { legacy: true, createdAt: serverTime() });
            data.completedAt = d.completedAtDate ? Timestamp.fromDate(d.completedAtDate) : null;
            ops.push(batch => batch.set(col('duties').doc(d.id), data));
        });

        ops.push(batch => batch.set(col('activity').doc(), activityDoc(activity)));

        await commitOps(ops);
    }

    async function deleteLegacy() {
        await col('app').doc('main').delete();
    }

    /* ---------- Public API ---------- */

    window.Backend = {
        onAuthChanged,
        signIn,
        setupAccount,
        changePin,
        signOut,
        authMessage,
        getProfile,
        setIdentity,
        watchEvents,
        watchDuties,
        watchUsers,
        watchActivity,
        newId,
        logActivity,
        createEvent,
        deleteEvent,
        addDuty,
        updateDuty,
        deleteDuty,
        setDutyCompleted,
        readLegacy,
        importLegacy,
        deleteLegacy
    };

    console.log('TinkerHub SBCE EventOps: Firebase backend ready');
})();