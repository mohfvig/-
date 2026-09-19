const firebaseConfig = {
  apiKey: "AIzaSyAgvwIvKuPsnFq31UFJEVmJCamN3gcrI_I",
  authDomain: "news-f45f8.firebaseapp.com",
  databaseURL: "https://news-f45f8-default-rtdb.firebaseio.com",
  projectId: "news-f45f8",
  storageBucket: "news-f45f8.firebasestorage.app",
  messagingSenderId: "721092679840",
  appId: "1:721092679840:web:7de47c9004a18b9df951c5",
  measurementId: "G-KSYSV35EZX"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const auth = firebase.auth();

let confirmationResultGlobal = null;

function setupRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            'size': 'invisible',
            'callback': (response) => {}
        }, auth);
    }
}

async function sendPhoneVerificationCode(phoneNumber) {
    try {
        setupRecaptcha();
        let formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+2' + phoneNumber; 
        const appVerifier = window.recaptchaVerifier;
        
        confirmationResultGlobal = await auth.signInWithPhoneNumber(formattedPhone, appVerifier);
        return { success: true, msg: "✅ تم إرسال رمز التحقق (SMS) إلى هاتفك بنجاح!" };
    } catch (error) {
        console.error("SMS Error:", error);
        if (window.recaptchaVerifier) {
            try {
                window.recaptchaVerifier.clear();
            } catch(e) {}
            window.recaptchaVerifier = null;
        }
        return { success: false, msg: "❌ فشل إرسال الرسالة، تأكد من صحة رقم الهاتف أو إعدادات الفايربيس." };
    }
}

async function verifyPhoneNumberCode(code) {
    try {
        const result = await confirmationResultGlobal.confirm(code);
        return { success: true, user: result.user };
    } catch (error) {
        console.error("OTP Error:", error);
        return { success: false, msg: "❌ رمز التحقق غير صحيح أو انتهت صلاحيته." };
    }
}

function createSession(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function getCurrentSession() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

function destroySession() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

async function logStudentUpdate(updateType, changesDetail = {}) {
    const user = getCurrentSession();
    if (!user || !user.phone) return;

    try {
        const updateRef = database.ref(`students/${user.phone}/profile_updates`).push();
        await updateRef.set({
            updateType: updateType,
            changes: changesDetail,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Update Logging Error:", error);
    }
}

async function loginOrRegisterStudent(data) {
    try {
        if (data.type === 'login') {
            const userRef = database.ref('students/' + data.phone);
            const snapshot = await userRef.once('value');

            if (!snapshot.exists()) {
                return { success: false, msg: "❌ هذا الرقم غير مسجل! قم بإنشاء حساب جديد." };
            }

            const userData = snapshot.val();

            if (userData.password !== data.password) {
                return { success: false, msg: "❌ كلمة المرور غير صحيحة!" };
            }

            const sessionData = {
                name: userData.fullName || "طالب",
                phone: data.phone,
                parentPhone: userData.parentPhone || "",
                gender: userData.gender || "ذكر",
                religion: userData.religion || "مسلم",
                grade: userData.grade || "الصف الأول الثانوي",
                coins: userData.coins || 0,
                purchasedCourses: userData.purchasedCourses || [],
                isAdmin: userData.isAdmin || false
            };

            createSession(sessionData);
            return { success: true, user: sessionData };
        } 
        else if (data.type === 'register') {
            const userRef = database.ref('students/' + data.studentPhone);
            const snapshot = await userRef.once('value');

            if (snapshot.exists()) {
                return { success: false, msg: "⚠️ هذا الرقم مسجل بالفعل! يمكنك تسجيل الدخول مباشرة." };
            }

            const newUser = {
                fullName: data.fullName,
                studentPhone: data.studentPhone,
                parentPhone: data.parentPhone,
                password: data.password,
                gender: data.gender,
                religion: data.religion,
                grade: data.grade,
                coins: 0,
                purchasedCourses: [],
                isAdmin: false,
                createdAt: new Date().toISOString()
            };

            await userRef.set(newUser);

            const sessionData = {
                name: data.fullName,
                phone: data.studentPhone,
                parentPhone: data.parentPhone,
                gender: data.gender,
                religion: data.religion,
                grade: data.grade,
                coins: 0,
                purchasedCourses: [],
                isAdmin: false
            };

            createSession(sessionData);
            return { success: true, user: sessionData };
        }
    } catch (error) {
        console.error("Firebase Error:", error);
        return { success: false, msg: "حدث خطأ أثناء الاتصال بقاعدة البيانات!" };
    }
}

async function checkAndActivateRechargeCode(code, phone) {
    try {
        const codeRef = database.ref('codes/' + code);
        const snapshot = await codeRef.once('value');

        if (!snapshot.exists()) {
            return { success: false, msg: "❌ الكود غير صحيح أو غير موجود!" };
        }

        const codeData = snapshot.val();

        if (codeData.isUsed) {
            return { success: false, msg: "⚠️ هذا الكود مستخدم من قبل!" };
        }

        const coinsToAdd = codeData.coinsAmount || 50;

        await codeRef.update({
            isUsed: true,
            usedBy: phone,
            usedAt: new Date().toISOString()
        });

        const studentRef = database.ref(`students/${phone}`);
        const studentSnap = await studentRef.once('value');
        const currentCoins = (studentSnap.exists() && studentSnap.val().coins) ? studentSnap.val().coins : 0;
        const updatedCoins = currentCoins + coinsToAdd;

        await studentRef.update({ coins: updatedCoins });

        await logStudentUpdate("شحن رصيد", { codeUsed: code, addedCoins: coinsToAdd, newBalance: updatedCoins });

        return { success: true, addedCoins: coinsToAdd, totalCoins: updatedCoins };
    } catch (error) {
        console.error("Code Verification Error:", error);
        return { success: false, msg: "حدث خطأ أثناء فحص الكود." };
    }
}

async function generateAndSaveCode(code, coinsAmount, adminPhone) {
    try {
        await database.ref('codes/' + code).set({
            coinsAmount: parseInt(coinsAmount) || 50,
            isUsed: false,
            createdAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        console.error("Code Generation Error:", error);
        return false;
    }
}
