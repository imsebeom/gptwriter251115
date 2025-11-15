import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    increment,
    query,
    orderBy,
    where,
    getDoc,
    setDoc,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 인증 관련 함수
export async function loginAnonymously(userName) {
    try {
        const userCredential = await signInAnonymously(auth);
        // 사용자 이름을 Firestore에 저장
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: userName,
            createdAt: new Date()
        }, { merge: true });
        return userCredential.user;
    } catch (error) {
        console.error('로그인 오류:', error);
        throw error;
    }
}

export function onAuthChange(callback) {
    return onAuthStateChanged(auth, callback);
}

export async function signOut() {
    await firebaseSignOut(auth);
}

// Firestore 관련 함수
export async function getUserName(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data().name : '익명';
}

// 주제/장르 관리
export async function getTopicsAndGenres() {
    const topicsSnapshot = await getDocs(collection(db, 'topics'));
    const genresSnapshot = await getDocs(collection(db, 'genres'));
    
    return {
        topics: topicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        genres: genresSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
}

export async function addTopic(name) {
    await addDoc(collection(db, 'topics'), {
        name: name,
        createdAt: new Date()
    });
}

export async function addGenre(name) {
    await addDoc(collection(db, 'genres'), {
        name: name,
        createdAt: new Date()
    });
}

export async function deleteTopic(id) {
    await deleteDoc(doc(db, 'topics', id));
}

export async function deleteGenre(id) {
    await deleteDoc(doc(db, 'genres', id));
}

// 글 작성 및 저장
export async function saveWriting(writingData) {
    const docRef = await addDoc(collection(db, 'writings'), {
        ...writingData,
        createdAt: new Date(),
        likes: 0,
        comments: []
    });
    return docRef.id;
}

export async function getWritings() {
    const q = query(collection(db, 'writings'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getWriting(id) {
    const docRef = doc(db, 'writings', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

// 좋아요 기능
export async function toggleLike(writingId, userId) {
    const writingRef = doc(db, 'writings', writingId);
    const writing = await getWriting(writingId);
    
    if (!writing.likedBy) {
        writing.likedBy = [];
    }
    
    const isLiked = writing.likedBy.includes(userId);
    
    if (isLiked) {
        await updateDoc(writingRef, {
            likes: increment(-1),
            likedBy: writing.likedBy.filter(id => id !== userId)
        });
    } else {
        await updateDoc(writingRef, {
            likes: increment(1),
            likedBy: [...writing.likedBy, userId]
        });
    }
}

// 댓글 기능
export async function addComment(writingId, commentData) {
    const writingRef = doc(db, 'writings', writingId);
    const writing = await getWriting(writingId);
    
    const comments = writing.comments || [];
    comments.push({
        ...commentData,
        createdAt: new Date()
    });
    
    await updateDoc(writingRef, {
        comments: comments
    });
}

