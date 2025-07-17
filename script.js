// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
    query,
    where
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDFUA91YU97Cb8ji97ahSV4086SzI1-vUA",
  authDomain: "quickquiz-a597a.firebaseapp.com",
  projectId: "quickquiz-a597a",
  storageBucket: "quickquiz-a597a.firebasestorage.app",
  messagingSenderId: "200552328440",
  appId: "1:200552328440:web:485dc23aa5de4ff30e5f0d",
  measurementId: "G-V975XM80EH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const appLoader = document.getElementById('app-loader');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const createQuizView = document.getElementById('create-quiz-view');
const takeQuizView = document.getElementById('take-quiz-view');
const resultsView = document.getElementById('results-view');

// Auth Form Elements
const userDisplayNameNav = document.getElementById('user-display-name');
const welcomeMessage = document.getElementById('welcome-message');
const logoutBtnNav = document.getElementById('logout-btn-nav');
const loginGoogleBtn = document.getElementById('login-google-btn');
const emailSigninBtn = document.getElementById('email-signin-btn');
const emailSignupBtn = document.getElementById('email-signup-btn');
const toggleAuthModeLink = document.getElementById('toggle-auth-mode-link');
const authError = document.getElementById('auth-error');

const createQuizBtn = document.getElementById('create-quiz-btn');
const yourQuizList = document.getElementById('your-quiz-list');
const otherQuizList = document.getElementById('other-quiz-list');


const saveQuizBtn = document.getElementById('save-quiz-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const submitQuizBtn = document.getElementById('submit-quiz-btn');

const deleteConfirmModalEl = document.getElementById('delete-confirm-modal');
const deleteConfirmModal = new bootstrap.Modal(deleteConfirmModalEl);
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Quiz Creation Elements
const questionsContainer = document.getElementById('questions-container');
const saveManualQuestionBtn = document.getElementById('save-manual-question-btn');
const addQuestionModalEl = document.getElementById('add-question-modal');
const addQuestionModal = new bootstrap.Modal(addQuestionModalEl);
const generateAnswerBtn = document.getElementById('generate-answer-btn');

// AI Generator Elements
const generateQuestionsBtn = document.getElementById('generate-questions-btn');

// State
let currentUser = null;
let questionsForCurrentQuiz = [];
let currentQuizForTaking = { id: null, title: '', questions: [], timeLimit: 0 };
let quizTimerInterval = null;
let quizToDeleteId = null;

// --- VIEW MANAGEMENT ---
function showView(viewId) {
    document.querySelectorAll('.container > section').forEach(function(view) {
        view.classList.add('d-none');
    });
    document.getElementById(viewId).classList.remove('d-none');
}

// --- AUTHENTICATION ---
onAuthStateChanged(auth, function(user) {
    if (user) {
        currentUser = user;
        userDisplayNameNav.textContent = user.displayName || 'User';
        if(welcomeMessage) {
             welcomeMessage.textContent = `Welcome, ${user.displayName || 'User'}!`;
        }
        userDisplayNameNav.classList.remove('d-none');
        logoutBtnNav.classList.remove('d-none');
        showView('dashboard-view');
        loadQuizzes();
    } else {
        currentUser = null;
        userDisplayNameNav.classList.add('d-none');
        logoutBtnNav.classList.add('d-none');
        showView('login-view');
    }
    appLoader.style.opacity = '0';
    setTimeout(function() { appLoader.classList.add('d-none'); }, 300);
});

toggleAuthModeLink.addEventListener('click', function(e) {
    e.preventDefault();
    const isSignUpMode = this.textContent.includes('Sign Up');
    authError.textContent = '';
    document.getElementById('display-name-container').classList.toggle('d-none', !isSignUpMode);
    emailSigninBtn.classList.toggle('d-none', isSignUpMode);
    emailSignupBtn.classList.toggle('d-none', !isSignUpMode);
    document.getElementById('login-title').textContent = isSignUpMode ? 'Create an Account' : 'Welcome to QuickQuiz';
    this.textContent = isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
});

async function handleAsyncButtonAction(button, action) {
    const originalText = button.innerHTML;
    button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
    button.disabled = true;
    try {
        await action();
    } catch (error) {
        console.error("Action Error:", error);
        alert(getFriendlyAuthError(error.code));
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

emailSignupBtn.addEventListener('click', function() {
    const displayName = document.getElementById('display-name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authError.textContent = '';
    if (!displayName || !email || !password) { authError.textContent = 'Please fill in all fields.'; return; }
    
    handleAsyncButtonAction(this, async function() {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: displayName });
    });
});

emailSigninBtn.addEventListener('click', function() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    authError.textContent = '';
    if (!email || !password) { authError.textContent = 'Please enter email and password.'; return; }
    
    handleAsyncButtonAction(this, function() {
        return signInWithEmailAndPassword(auth, email, password);
    });
});

loginGoogleBtn.addEventListener('click', function() {
    handleAsyncButtonAction(this, function() {
        return signInWithPopup(auth, new GoogleAuthProvider());
    });
});


logoutBtnNav.addEventListener('click', function() {
    signOut(auth);
});

function getFriendlyAuthError(code) {
    switch (code) {
        case 'auth/email-already-in-use': return 'This email address is already in use.';
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/weak-password': return 'Password should be at least 6 characters.';
        case 'auth/operation-not-allowed': return 'Email/password sign-in is not enabled.';
        case 'auth/user-not-found': case 'auth/wrong-password': case 'auth/invalid-credential': return 'Invalid email or password.';
        case 'auth/popup-closed-by-user': return 'Sign-in process cancelled.';
        default: return 'An unknown error occurred. Please try again.';
    }
}
// --- END OF AUTH ---

// --- NAVIGATION ---
createQuizBtn.addEventListener('click', function() {
    showCreateQuizView();
});
backToDashboardBtn.addEventListener('click', function() {
    showView('dashboard-view');
    loadQuizzes();
});
cancelEditBtn.addEventListener('click', function() {
    showView('dashboard-view');
});

// --- DASHBOARD ---
async function loadQuizzes() {
    if (!currentUser) return;
    yourQuizList.innerHTML = '<div class="text-center w-100"><div class="spinner-border text-white" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    otherQuizList.innerHTML = '<div class="text-center w-100"><div class="spinner-border text-white" role="status"><span class="visually-hidden">Loading...</span></div></div>';
    
    try {
        const quizzesPromise = getDocs(collection(db, "quizzes"));
        const attemptsPromise = getDocs(query(collection(db, "quizAttempts"), where("userId", "==", currentUser.uid)));
        const [quizzesSnapshot, attemptsSnapshot] = await Promise.all([quizzesPromise, attemptsPromise]);

        const userAttempts = {};
        attemptsSnapshot.forEach(function(doc) {
            const attempt = doc.data();
            if (!userAttempts[attempt.quizId]) {
                userAttempts[attempt.quizId] = { latest: null, count: 0 };
            }
            userAttempts[attempt.quizId].count++;
            if (!userAttempts[attempt.quizId].latest || attempt.attemptedAt.toMillis() > userAttempts[attempt.quizId].latest.attemptedAt.toMillis()) {
                userAttempts[attempt.quizId].latest = attempt;
            }
        });

        let yourQuizzesHtml = '';
        let otherQuizzesHtml = '';
        
        const quizDocs = quizzesSnapshot.docs.sort(function(a, b) {
            return (b.data().createdAt?.toMillis() || 0) - (a.data().createdAt?.toMillis() || 0);
        });
        
        quizDocs.forEach(function(doc) {
            const quiz = doc.data();
            const attemptData = userAttempts[doc.id];
            const attempt = attemptData ? attemptData.latest : null;
            const attemptCount = attemptData ? attemptData.count : 0;

            let attemptInfoHtml = `<p class="card-text text-muted mb-0 mt-2">Not attempted yet</p>`;
            if (attempt) {
                let scoreColorClass = 'text-success';
                if (attempt.percentage < 40) scoreColorClass = 'text-danger';
                else if (attempt.percentage < 70) scoreColorClass = 'text-warning';
                else if (attempt.percentage < 90) scoreColorClass = 'text-info';
                attemptInfoHtml = `
                    <p class="card-text ${scoreColorClass} fw-bold mb-0 mt-2">Last Score: ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%)</p>
                    <p class="card-text text-muted mb-0 mt-1"><small>Attempted: ${attemptCount} time(s)</small></p>
                `;
            }

            let cardHtml = '';
            const isCreator = currentUser.uid === quiz.creatorId;

            const creatorControls = isCreator ? `
                <div class="mt-3 border-top pt-2 d-flex justify-content-end">
                    <button class="btn btn-secondary me-2 edit-quiz-btn" data-id="${doc.id}">Edit</button>
                    <button class="btn btn-danger delete-quiz-btn" data-id="${doc.id}">Delete</button>
                </div>
            ` : '';

            cardHtml = `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body d-flex flex-column quiz-card-main" data-id="${doc.id}">
                            <h5 class="card-title">${quiz.title}</h5>
                            <p class="card-text flex-grow-1">${quiz.description}</p>
                            <p class="card-text mt-auto mb-0"><small class="text-muted">By: ${isCreator ? 'You' : (quiz.creatorName || 'Anonymous')}</small></p>
                            ${attemptInfoHtml}
                        </div>
                        ${creatorControls}
                    </div>
                </div>
            `;
            
            if (isCreator) {
                yourQuizzesHtml += cardHtml;
            } else {
                otherQuizzesHtml += cardHtml;
            }
        });
        
        yourQuizList.innerHTML = yourQuizzesHtml || '<p class="text-center text-white-50 w-100">You haven\'t created any quizzes yet.</p>';
        otherQuizList.innerHTML = otherQuizzesHtml || '<p class="text-center text-white-50 w-100">No other quizzes available.</p>';
        
        document.querySelectorAll('.quiz-card-main').forEach(function(card) {
            card.addEventListener('click', function() {
                startQuiz(this.dataset.id);
            });
        });
        document.querySelectorAll('.edit-quiz-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                showEditQuizView(this.dataset.id);
            });
        });
        document.querySelectorAll('.delete-quiz-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                handleDeleteClick(this.dataset.id);
            });
        });

    } catch (error) {
        console.error("Error loading quizzes: ", error);
        yourQuizList.innerHTML = '<p class="text-center text-danger w-100">Could not load your quizzes.</p>';
        otherQuizList.innerHTML = '<p class="text-center text-danger w-100">Could not load other quizzes.</p>';
    }
}

// --- QUIZ CREATION & EDITING ---
function showCreateQuizView() {
    showView('create-quiz-view');
    document.getElementById('create-edit-title').textContent = 'Create a New Quiz';
    document.getElementById('editing-quiz-id').value = '';
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-description').value = '';
    document.getElementById('quiz-time-limit').value = '0';
    questionsForCurrentQuiz = [];
    cancelEditBtn.classList.add('d-none');
    renderQuestionsInCreator();
}

async function showEditQuizView(quizId) {
    showView('create-quiz-view');
    document.getElementById('create-edit-title').textContent = 'Edit Quiz';
    cancelEditBtn.classList.remove('d-none');
    
    const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
    const quizData = quizDoc.data();
    
    document.getElementById('editing-quiz-id').value = quizId;
    document.getElementById('quiz-title').value = quizData.title;
    document.getElementById('quiz-description').value = quizData.description;
    document.getElementById('quiz-time-limit').value = quizData.timeLimit || 0;

    const questionsSnapshot = await getDocs(collection(db, `quizzes/${quizId}/questions`));
    questionsForCurrentQuiz = questionsSnapshot.docs.map(d => d.data());
    renderQuestionsInCreator();
}

saveQuizBtn.addEventListener('click', function() {
    const quizId = document.getElementById('editing-quiz-id').value;
    const isEditing = !!quizId;

    const quizData = {
        title: document.getElementById('quiz-title').value,
        description: document.getElementById('quiz-description').value,
        timeLimit: parseInt(document.getElementById('quiz-time-limit').value) || 0,
        creatorId: currentUser.uid,
        creatorName: currentUser.displayName
    };

    if (!quizData.title || questionsForCurrentQuiz.length === 0) {
        alert('Please provide a title and at least one question.');
        return;
    }

    handleAsyncButtonAction(this, async function() {
        if (isEditing) {
            const quizDocRef = doc(db, 'quizzes', quizId);
            await updateDoc(quizDocRef, { title: quizData.title, description: quizData.description, timeLimit: quizData.timeLimit });
            
            const oldQuestionsSnapshot = await getDocs(collection(db, `quizzes/${quizId}/questions`));
            const batch = writeBatch(db);
            oldQuestionsSnapshot.forEach(d => batch.delete(d.ref));
            questionsForCurrentQuiz.forEach(q => {
                const newQuestionRef = doc(collection(db, `quizzes/${quizId}/questions`));
                batch.set(newQuestionRef, q);
            });
            await batch.commit();
            alert('Quiz updated successfully!');
        } else {
            quizData.createdAt = new Date();
            const quizDocRef = await addDoc(collection(db, 'quizzes'), quizData);
            const batch = writeBatch(db);
            questionsForCurrentQuiz.forEach(q => {
                const newQuestionRef = doc(collection(db, `quizzes/${quizDocRef.id}/questions`));
                batch.set(newQuestionRef, q);
            });
            await batch.commit();
            alert('Quiz saved successfully!');
        }
        showView('dashboard-view');
        loadQuizzes();
    });
});

function renderQuestionsInCreator() {
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';
    if (questionsForCurrentQuiz.length === 0) {
        questionsContainer.innerHTML = '<p class="text-center text-muted mt-3">No questions added yet.</p>';
        return;
    }
    questionsForCurrentQuiz.forEach(function(q, index) {
        const questionCard = document.createElement('div');
        questionCard.className = 'card mb-3 bg-light';
        questionCard.innerHTML = `
            <div class="card-body position-relative">
                 <button type="button" class="btn-close delete-question-btn" aria-label="Close" data-index="${index}" style="position: absolute; top: 10px; right: 10px;"></button>
                <p class="mb-2"><strong>Q${index + 1}:</strong> ${q.question}</p>
                <ul class="list-group">
                    ${q.options.map((opt, i) => `<li class="list-group-item ${i === q.correctAnswerIndex ? 'list-group-item-success fw-bold' : ''}">${opt}</li>`).join('')}
                </ul>
            </div>
        `;
        questionsContainer.appendChild(questionCard);
    });

    document.querySelectorAll('.delete-question-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            const questionIndex = parseInt(e.target.dataset.index);
            questionsForCurrentQuiz.splice(questionIndex, 1);
            renderQuestionsInCreator();
        });
    });
}

saveManualQuestionBtn.addEventListener('click', function() {
    const questionText = document.getElementById('manual-question-text').value;
    const options = Array.from(document.querySelectorAll('.manual-option')).map(input => input.value);
    const correctAnswer = document.getElementById('manual-correct-answer').value;
    
    if (!questionText || !correctAnswer || options.some(opt => !opt)) {
        alert('Please fill out the question, the correct answer, and all four option fields.');
        return;
    }

    const correctAnswerIndex = options.indexOf(correctAnswer);
    if (correctAnswerIndex === -1) {
        alert('The correct answer must match one of the options.');
        return;
    }

    questionsForCurrentQuiz.push({ question: questionText, options, correctAnswerIndex });
    renderQuestionsInCreator();
    addQuestionModal.hide();
    
    // Reset form
    document.getElementById('manual-question-text').value = '';
    document.getElementById('manual-correct-answer').value = '';
    document.querySelectorAll('.manual-option').forEach(input => input.value = '');
});

// --- QUIZ DELETION ---
function handleDeleteClick(quizId) {
    quizToDeleteId = quizId;
    deleteConfirmModal.show();
}

confirmDeleteBtn.addEventListener('click', function() {
    if (!quizToDeleteId) return;
    
    handleAsyncButtonAction(this, async function() {
        const quizIdToDelete = quizToDeleteId; // Local copy for safety

        // Step 1: Delete all attempts associated with the quiz.
        const attemptsRef = collection(db, 'quizAttempts');
        const attemptsQuery = query(attemptsRef, where("quizId", "==", quizIdToDelete));
        const attemptsSnapshot = await getDocs(attemptsQuery);
        const attemptsBatch = writeBatch(db);
        attemptsSnapshot.forEach(doc => attemptsBatch.delete(doc.ref));
        await attemptsBatch.commit();

        // Step 2: Delete all questions in the subcollection.
        const questionsRef = collection(db, `quizzes/${quizIdToDelete}/questions`);
        const questionsSnapshot = await getDocs(questionsRef);
        const questionsBatch = writeBatch(db);
        questionsSnapshot.forEach(doc => questionsBatch.delete(doc.ref));
        await questionsBatch.commit();

        // Step 3: Delete the main quiz document itself.
        await deleteDoc(doc(db, 'quizzes', quizIdToDelete));

        alert('Quiz deleted successfully.');
        deleteConfirmModal.hide();
        loadQuizzes();
        quizToDeleteId = null;
    });
});


// --- QUIZ TAKING & TIMER ---
async function startQuiz(quizId) {
    const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
    const quizData = quizDoc.data();
    const questionsSnapshot = await getDocs(collection(db, `quizzes/${quizId}/questions`));
    
    currentQuizForTaking = {
        id: quizId,
        title: quizData.title,
        questions: questionsSnapshot.docs.map(d => d.data()),
        timeLimit: quizData.timeLimit || 0
    };

    document.getElementById('quiz-title-display').innerText = quizData.title;
    document.getElementById('quiz-description-display').innerText = quizData.description;
    renderQuizQuestions();
    startTimer();
    showView('take-quiz-view');
}

function startTimer() {
    clearInterval(quizTimerInterval);
    const timerContainer = document.getElementById('timer-container');
    if (currentQuizForTaking.timeLimit <= 0) {
        timerContainer.innerHTML = '';
        return;
    }

    let timeRemaining = currentQuizForTaking.timeLimit * 60;
    
    const updateTimerDisplay = () => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        timerContainer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    updateTimerDisplay();
    
    quizTimerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(quizTimerInterval);
            document.getElementById('results-title').textContent = "Time's Up!";
            submitQuizBtn.click();
        }
    }, 1000);
}

submitQuizBtn.addEventListener('click', async function() {
    clearInterval(quizTimerInterval);
    let score = 0;
    currentQuizForTaking.questions.forEach(function(q, index) {
        const selectedOption = document.querySelector(`input[name="question-${index}"]:checked`);
        if (selectedOption && parseInt(selectedOption.value) === q.correctAnswerIndex) {
            score++;
        }
    });

    const totalQuestions = currentQuizForTaking.questions.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

    await addDoc(collection(db, 'quizAttempts'), {
        userId: currentUser.uid,
        quizId: currentQuizForTaking.id,
        quizTitle: currentQuizForTaking.title,
        score, 
        totalQuestions, 
        percentage,
        attemptedAt: new Date()
    });

    document.getElementById('score-display').innerText = `Your Score: ${score} / ${totalQuestions}`;
    const progressBar = document.getElementById('score-progress-bar');
    progressBar.style.width = `${percentage}%`;
    progressBar.innerText = `${percentage}%`;
    showView('results-view');
});

function renderQuizQuestions() {
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = '';
    currentQuizForTaking.questions.forEach(function(q, index) {
        const questionHtml = `
            <div class="card mb-3">
                <div class="card-body">
                    <p><strong>Question ${index + 1}:</strong> ${q.question}</p>
                    ${q.options.map((option, optionIndex) => `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="question-${index}" id="q-${index}-o-${optionIndex}" value="${optionIndex}">
                            <label class="form-check-label" for="q-${index}-o-${optionIndex}">
                                ${option}
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        quizContent.innerHTML += questionHtml;
    });
}

// --- AI QUESTION GENERATION ---
async function callGemini(prompt, expectJson = true) {
    // This function now calls our secure Vercel endpoint
    const response = await fetch('/api/call-gemini', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, expectJson }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API call failed');
    }

    const result = await response.json();
    return result.data;
}

generateQuestionsBtn.addEventListener('click', function() {
    const topic = document.getElementById('ai-topic').value;
    const numQuestions = document.getElementById('ai-num-questions').value;

    if (!topic) {
        alert("Please enter a topic for the AI to generate questions.");
        return;
    }
    
    handleAsyncButtonAction(this, async function() {
        const prompt = `Generate ${numQuestions} multiple-choice questions about "${topic}". Each question must have 4 options. Format the output as a valid JSON array of objects, where each object has a "question" (string), "options" (array of 4 strings), and "correctAnswerIndex" (integer from 0 to 3). Do not include any text before or after the JSON array.`;

        try {
            const generatedQuestions = await callGemini(prompt);
            questionsForCurrentQuiz.push(...generatedQuestions);
            renderQuestionsInCreator();
        } catch (error) {
            console.error("AI Generation Error:", error);
            alert("Failed to generate questions. The AI may have returned an unusual response. Please try again or add questions manually.");
        }
    });
});

generateAnswerBtn.addEventListener('click', function() {
    const question = document.getElementById('manual-question-text').value;
    if (!question) {
        alert("Please provide the question first.");
        return;
    }

    handleAsyncButtonAction(this, async function() {
        const prompt = `For the question "${question}", determine the correct answer and generate three plausible but incorrect multiple-choice options (distractors). Return a single JSON object with two keys: "correctAnswer" (string) and "distractors" (an array of 3 strings).`;
        try {
            const result = await callGemini(prompt);
            if (!result.correctAnswer || !Array.isArray(result.distractors) || result.distractors.length < 3) {
                throw new Error("AI returned data in an unexpected format.");
            }
            
            document.getElementById('manual-correct-answer').value = result.correctAnswer;
            const allOptions = [result.correctAnswer, ...result.distractors];
            for (let i = allOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
            }
            
            document.querySelectorAll('.manual-option').forEach((input, i) => {
                input.value = allOptions[i];
            });

        } catch (error) {
            console.error("Answer Generation Error:", error);
            alert("Failed to generate an answer and options. Please try again.");
        }
    });
});
