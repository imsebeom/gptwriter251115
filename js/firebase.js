import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged,
    signOut as firebaseSignOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup
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
// 테스트용 익명 로그인
export async function loginAnonymously(userName) {
    try {
        const userCredential = await signInAnonymously(auth);
        // 사용자 이름을 Firestore에 저장
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: userName,
            userType: 'test',
            createdAt: new Date()
        }, { merge: true });
        return userCredential.user;
    } catch (error) {
        console.error('로그인 오류:', error);
        throw error;
    }
}

// 비밀번호 해시 함수 (간단한 SHA-256 해시)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// 비밀번호 검증
async function verifyPassword(password, hashedPassword) {
    const hash = await hashPassword(password);
    return hash === hashedPassword;
}

// 학생 회원가입 (교사가 추가) - Firestore에 직접 저장
export async function signUpStudent(name, email, password, teacherId) {
    // 현재 사용자 정보 저장 (학생 추가 후 복원하기 위해)
    const currentAuthUser = auth.currentUser;
    const currentUserProvider = currentAuthUser?.providerData?.[0]?.providerId;
    const currentUserData = currentAuthUser ? await getUserData(currentAuthUser.uid) : null;
    const currentUserName = currentUserData?.name;
    const currentUserUid = currentAuthUser?.uid;
    
    try {
        // 중복 체크: 같은 아이디가 이미 있는지 확인
        const usersSnapshot = await getDocs(collection(db, 'users'));
        for (const docSnap of usersSnapshot.docs) {
            const userData = docSnap.data();
            if (userData.userType === 'student' && userData.email === email) {
                throw new Error('이미 사용 중인 아이디입니다.');
            }
        }
        
        // 비밀번호 해시
        const hashedPassword = await hashPassword(password);
        
        // 구글 로그인 사용자는 자동 재로그인을 시도하지 않고, 로그아웃 상태로 유지
        if (currentUserProvider === 'google.com' && currentAuthUser) {
            // 임시로 익명 인증을 사용하여 학생 문서 생성
            const tempCredential = await signInAnonymously(auth);
            const studentUid = tempCredential.user.uid;
            
            // 학생 정보 저장
            await setDoc(doc(db, 'users', studentUid), {
                name: name,
                email: email,
                passwordHash: hashedPassword,
                userType: 'student',
                teacherId: teacherId,
                createdAt: new Date()
            }, { merge: true });
            
            // 로그아웃 (구글 로그인은 자동 복원이 안 되므로 수동 로그인 필요)
            await firebaseSignOut(auth);
            
            // 구글 로그인 사용자는 자동 복원이 안 되므로 needsReload 플래그 반환
            // 학생관리 페이지에서 페이지 새로고침 후 다시 로그인하도록 안내
            return { success: true, studentId: studentUid, needsReload: true };
        } else {
            // 익명 사용자나 다른 경우
            const userCredential = await signInAnonymously(auth);
            const uid = userCredential.user.uid;
            
            // 사용자 정보를 Firestore에 저장
            await setDoc(doc(db, 'users', uid), {
                name: name,
                email: email, // 로그인 아이디
                passwordHash: hashedPassword, // 해시된 비밀번호
                userType: 'student',
                teacherId: teacherId, // 학생을 추가한 교사 ID
                createdAt: new Date()
            }, { merge: true });
            
            // 원래 사용자로 복원
            await firebaseSignOut(auth);
            
            // 익명 사용자는 이름으로 다시 로그인
            if (currentUserProvider === 'anonymous' && currentUserName) {
                await loginAnonymously(currentUserName);
            }
            
            return { success: true, studentId: uid };
        }
    } catch (error) {
        // 오류 발생 시 원래 사용자로 복원 시도
        if (currentAuthUser && currentUserProvider === 'anonymous' && currentUserName) {
            try {
                await firebaseSignOut(auth);
                await loginAnonymously(currentUserName);
            } catch (restoreError) {
                console.error('사용자 복원 오류:', restoreError);
            }
        }
        console.error('회원가입 오류:', error);
        throw error;
    }
}

// 학생 로그인 - Firestore에서 확인
export async function loginStudent(email, password) {
    try {
        // Firestore에서 학생 찾기
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let studentDocId = null;
        let studentData = null;
        
        for (const docSnap of usersSnapshot.docs) {
            const userData = docSnap.data();
            if (userData.userType === 'student' && userData.email === email) {
                studentDocId = docSnap.id;
                studentData = userData;
                break;
            }
        }
        
        if (!studentDocId || !studentData) {
            throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
        
        // 비밀번호 검증
        const isValid = await verifyPassword(password, studentData.passwordHash);
        if (!isValid) {
            throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
        
        // 익명 인증으로 로그인 (세션 관리를 위해)
        const userCredential = await signInAnonymously(auth);
        const sessionUid = userCredential.user.uid;
        
        // 세션 정보를 Firestore에 저장 (학생 문서 ID와 연결)
        await setDoc(doc(db, 'sessions', sessionUid), {
            studentDocId: studentDocId,
            studentEmail: email,
            loginAt: new Date()
        });
        
        // 학생 문서에 마지막 로그인 시간 업데이트
        await setDoc(doc(db, 'users', studentDocId), {
            lastLoginAt: new Date()
        }, { merge: true });
        
        // 사용자 정보를 세션 문서에도 저장 (빠른 접근을 위해)
        await setDoc(doc(db, 'users', sessionUid), {
            ...studentData,
            sessionFor: studentDocId, // 원본 학생 문서 ID
            createdAt: new Date()
        });
        
        return userCredential.user;
    } catch (error) {
        console.error('로그인 오류:', error);
        throw error;
    }
}

// 교사 구글 로그인
export async function loginTeacherWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        
        // 사용자 정보를 Firestore에 저장
        const user = userCredential.user;
        await setDoc(doc(db, 'users', user.uid), {
            name: user.displayName || user.email,
            email: user.email,
            userType: 'teacher',
            createdAt: new Date()
        }, { merge: true });
        
        return user;
    } catch (error) {
        console.error('구글 로그인 오류:', error);
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
    if (userDoc.exists()) {
        const userData = userDoc.data();
        // 세션 문서인 경우 원본 학생 문서에서 이름 가져오기
        if (userData.sessionFor) {
            const originalDoc = await getDoc(doc(db, 'users', userData.sessionFor));
            if (originalDoc.exists()) {
                return originalDoc.data().name;
            }
        }
        return userData.name || '익명';
    }
    return '익명';
}

export async function getUserData(uid) {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
        const userData = userDoc.data();
        // 세션 문서인 경우 원본 학생 문서에서 데이터 가져오기
        if (userData.sessionFor) {
            const originalDoc = await getDoc(doc(db, 'users', userData.sessionFor));
            if (originalDoc.exists()) {
                const originalData = originalDoc.data();
                // passwordHash는 제외하고 반환, 원본 문서 ID도 포함
                const { passwordHash, ...safeData } = originalData;
                return { ...safeData, originalDocId: userData.sessionFor };
            }
        }
        // passwordHash는 제외하고 반환
        const { passwordHash, ...safeData } = userData;
        return safeData;
    }
    return null;
}

// 학생의 원본 문서 ID 가져오기 (글 작성 시 사용)
export async function getStudentOriginalDocId(uid) {
    const userData = await getUserData(uid);
    return userData?.originalDocId || uid;
}

export async function isTeacher(user) {
    if (!user) return false;
    const userData = await getUserData(user.uid);
    return userData?.userType === 'teacher';
}

// 학생을 현재 교사의 학생으로 설정 (teacherId를 현재 사용자 uid로 설정)
export async function setStudentAsMyStudent(studentName, teacherUid) {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let foundStudent = null;
        
        usersSnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.userType === 'student' && userData.name === studentName) {
                foundStudent = {
                    id: docSnap.id,
                    data: userData
                };
            }
        });
        
        if (!foundStudent) {
            throw new Error(`"${studentName}" 학생을 찾을 수 없습니다.`);
        }
        
        // teacherId를 현재 교사(임세범)의 uid로 설정
        await updateDoc(doc(db, 'users', foundStudent.id), {
            teacherId: teacherUid
        });
        
        return { success: true, studentId: foundStudent.id };
    } catch (error) {
        console.error('학생 설정 오류:', error);
        throw error;
    }
}

// 학생을 테스트 학생으로 설정 (teacherId를 null로 설정) - 기존 함수 유지
export async function setStudentAsTest(studentName) {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let foundStudent = null;
        
        usersSnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.userType === 'student' && userData.name === studentName) {
                foundStudent = {
                    id: docSnap.id,
                    data: userData
                };
            }
        });
        
        if (!foundStudent) {
            throw new Error(`"${studentName}" 학생을 찾을 수 없습니다.`);
        }
        
        // teacherId를 null로 설정 (테스트 학생으로 만들기)
        await updateDoc(doc(db, 'users', foundStudent.id), {
            teacherId: null
        });
        
        return { success: true, studentId: foundStudent.id };
    } catch (error) {
        console.error('테스트 학생 설정 오류:', error);
        throw error;
    }
}

// 교사 삭제
export async function deleteTeacher(teacherId) {
    try {
        await deleteDoc(doc(db, 'users', teacherId));
        return { success: true };
    } catch (error) {
        console.error('교사 삭제 오류:', error);
        throw error;
    }
}

// 학생의 교사 매칭 변경
export async function updateStudentTeacher(studentId, newTeacherId) {
    try {
        await updateDoc(doc(db, 'users', studentId), {
            teacherId: newTeacherId || null
        });
        return { success: true };
    } catch (error) {
        console.error('학생 교사 매칭 변경 오류:', error);
        throw error;
    }
}

// 모든 교사 목록 가져오기
export async function getAllTeachers() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const teachers = [];
        
        usersSnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.userType === 'teacher') {
                teachers.push({
                    id: docSnap.id,
                    ...userData
                });
            }
        });
        
        return teachers;
    } catch (error) {
        console.error('교사 목록 가져오기 오류:', error);
        throw error;
    }
}

// 모든 학생 목록 가져오기
export async function getAllStudents() {
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const students = [];
        
        usersSnapshot.forEach(docSnap => {
            const userData = docSnap.data();
            if (userData.userType === 'student') {
                students.push({
                    id: docSnap.id,
                    ...userData
                });
            }
        });
        
        return students;
    } catch (error) {
        console.error('학생 목록 가져오기 오류:', error);
        throw error;
    }
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

