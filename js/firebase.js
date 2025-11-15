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

// 프롬프트 관리
export async function getCoachingPrompt() {
    const promptDoc = await getDoc(doc(db, 'settings', 'coachingPrompt'));
    if (promptDoc.exists()) {
        return promptDoc.data().prompt;
    }
    // 기본 프롬프트 반환
    return `당신은 초등학생의 글쓰기 실력을 칭찬하고 격려하며 성장시키는 'AI 글쓰기 코치'입니다. 초등학교 5학년 학생이 쓴 글을 검토해주세요.

학생의 장점을 먼저 칭찬하고 격려하는 말을 꼭 해주세요.
그다음, 아래 세 가지 관점에서 피드백해주세요.

1. [주제와 내용] : 글의 내용이 선택한 주제(혹은 장르)와 얼마나 잘 연결되나요?
2. [생각과 표현] : 글쓴이의 생각이나 느낌이 명확하고 구체적으로 잘 표현되었나요?
3. [더 멋진 글로!] : 어휘를 더 풍부하게 사용하거나, 문장의 연결을 다듬어서 글을 더 좋게 만들 수 있는 부분은 없을까요?

각 항목에 대해 학생이 스스로 생각하고 글을 고칠 수 있도록, 친절하게 질문을 던지는 방식으로 코칭해주세요. 답변은 마크다운으로 작성해주세요.`;
}

export async function saveCoachingPrompt(prompt) {
    await setDoc(doc(db, 'settings', 'coachingPrompt'), {
        prompt: prompt,
        updatedAt: new Date()
    }, { merge: true });
}

// 주제별 프롬프트 관리
export async function getTopicPrompt(topicId) {
    const promptDoc = await getDoc(doc(db, 'topics', topicId));
    if (promptDoc.exists() && promptDoc.data().additionalPrompt) {
        return promptDoc.data().additionalPrompt;
    }
    return '';
}

export async function saveTopicPrompt(topicId, prompt) {
    await updateDoc(doc(db, 'topics', topicId), {
        additionalPrompt: prompt,
        promptUpdatedAt: new Date()
    });
}

// 장르별 프롬프트 관리
export async function getGenrePrompt(genreId) {
    const promptDoc = await getDoc(doc(db, 'genres', genreId));
    if (promptDoc.exists() && promptDoc.data().additionalPrompt) {
        return promptDoc.data().additionalPrompt;
    }
    return '';
}

export async function saveGenrePrompt(genreId, prompt) {
    await updateDoc(doc(db, 'genres', genreId), {
        additionalPrompt: prompt,
        promptUpdatedAt: new Date()
    });
}

