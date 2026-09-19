const availableCourses = [
    {
        id: "math_sec1",
        grade: "الصف الأول الثانوي",
        title: "كورس الرياضيات - جبر وهندسة (أولى ثانوي)",
        price: 50,
        description: "شرح كامل لمبادئ الجبر والهندسة وحل أسئلة بنك المعرفة والامتحانات.",
        videos: [
            { title: "الدرس 1: الأعداد المركبة", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
            { title: "الدرس 2: حل معادلات الدرجة الثانية", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }
        ]
    },
    {
        id: "math_sec2",
        grade: "الصف الثاني الثانوي",
        title: "كورس الرياضيات - الجبر والتفاضل (تانية ثانوي)",
        price: 50,
        description: "شرح مبسط لجميع الدروس مع حل التمارين واختبارات المتابعة الدورية.",
        videos: [
            { title: "الدرس 1: الدوال الحقيقية ومجالها", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" },
            { title: "الدرس 2: الأسس واللوغاريتمات", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4" }
        ]
    },
    {
        id: "physics_sec2",
        grade: "الصف الثاني الثانوي",
        title: "كورس الفيزياء - الميكانيكا والموجات (تانية ثانوي)",
        price: 60,
        description: "تغطية كاملة للمنهج مع تجارب بصرية تفاعلية وحل تدريبات الامتحانات.",
        videos: [
            { title: "الدرس 1: مقدمة الحركة الموجية", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }
        ]
    },
    {
        id: "physics_sec3",
        grade: "الصف الثالث الثانوي",
        title: "كورس الفيزياء الحديثة والكهربية (تالتة ثانوي)",
        price: 100,
        description: "مراجعة شاملة نهائية وحل تجميعات امتحانات السنوات السابقة.",
        videos: [
            { title: "الدرس 1: التيار الكهربي وقانون أوم", url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4" }
        ]
    }
];

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

document.addEventListener("DOMContentLoaded", () => {
    const currentUser = typeof getCurrentSession === 'function' ? getCurrentSession() : null;
    
    if (!currentUser && !window.location.pathname.includes('login.html')) {
        window.location.replace('login.html');
        return;
    }

    if (currentUser) {
        updateCoinsDisplay(currentUser.coins || 0);

        if (currentUser.isAdmin) {
            const adminBtn = document.getElementById('adminToggleBtn');
            if (adminBtn) adminBtn.classList.remove('hidden');
        }

        loadProfileData();
        renderCourses();

        if (typeof database !== 'undefined' && currentUser.phone) {
            database.ref('students/' + currentUser.phone).once('value').then(snapshot => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    currentUser.coins = data.coins || 0;
                    currentUser.purchasedCourses = data.purchasedCourses || [];
                    currentUser.gender = data.gender || currentUser.gender || "ذكر";
                    currentUser.religion = data.religion || currentUser.religion || "مسلم";
                    currentUser.grade = data.grade || currentUser.grade || "الصف الأول الثانوي";
                    currentUser.isAdmin = data.isAdmin || false;
                    
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    updateCoinsDisplay(currentUser.coins);
                    if (currentUser.isAdmin) {
                        const adminBtn = document.getElementById('adminToggleBtn');
                        if (adminBtn) adminBtn.classList.remove('hidden');
                    }
                    loadProfileData();
                    renderCourses();
                }
            }).catch(e => console.warn("Sync:", e));
        }
    }
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const contentSec = document.getElementById('courseContentSection');
    if (contentSec) contentSec.classList.add('hidden');

    if (tabName === 'buy') {
        document.getElementById('tabBuyCourses').classList.remove('hidden');
        document.getElementById('btnTabBuy').classList.add('active');
    } else if (tabName === 'my') {
        document.getElementById('tabMyCourses').classList.remove('hidden');
        document.getElementById('btnTabMy').classList.add('active');
    } else if (tabName === 'profile') {
        document.getElementById('tabProfile').classList.remove('hidden');
        document.getElementById('btnTabProfile').classList.add('active');
    }
}

function updateCoinsDisplay(amount) {
    const user = getCurrentSession();
    if (user) {
        user.coins = amount;
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    const coinEl = document.getElementById('userCoinsDisplay');
    if (coinEl) coinEl.innerText = amount;
}

function renderCourses() {
    const user = getCurrentSession() || {};
    const userGrade = user.grade || "الصف الأول الثانوي";
    const purchased = user.purchasedCourses || [];

    const gradeDisplay = document.getElementById('userGradeDisplay');
    if (gradeDisplay) gradeDisplay.innerText = userGrade;

    const buyContainer = document.getElementById('buyCoursesList');
    const myContainer = document.getElementById('myCoursesList');

    if (!buyContainer || !myContainer) return;

    buyContainer.innerHTML = "";
    myContainer.innerHTML = "";

    const filteredCourses = availableCourses.filter(c => c.grade === userGrade);

    if (filteredCourses.length === 0) {
        buyContainer.innerHTML = `<p style="color:var(--text-muted);">لا تتوفر كورسات حالياً لـ ${userGrade}</p>`;
    } else {
        filteredCourses.forEach(course => {
            const isBought = purchased.includes(course.id);
            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <div>
                    <h4>${course.title}</h4>
                    <p>${course.description}</p>
                </div>
                <div>
                    <div class="price-tag">🪙 ${course.price} عملة</div>
                    ${isBought 
                        ? `<button onclick="openCourse('${course.id}')" class="btn btn-success" style="width:100%;">مشاهدة الكورس 📖</button>`
                        : `<button onclick="buyCourse('${course.id}')" class="btn btn-primary" style="width:100%;">شراء الكورس 🛒</button>`
                    }
                </div>
            `;
            buyContainer.appendChild(card);
        });
    }

    const myPurchasedCourses = availableCourses.filter(c => purchased.includes(c.id));
    if (myPurchasedCourses.length === 0) {
        myContainer.innerHTML = `<p style="color:var(--text-muted);">لم تقم بشراء أي كورسات حتى الآن. توجه إلى قسم "شراء كورس" لاختيار كورساتك.</p>`;
    } else {
        myPurchasedCourses.forEach(course => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <div>
                    <h4>${course.title}</h4>
                    <p>${course.description}</p>
                </div>
                <div>
                    <button onclick="openCourse('${course.id}')" class="btn btn-success" style="width:100%;">فتح المحاضرة 📖</button>
                </div>
            `;
            myContainer.appendChild(card);
        });
    }
}

async function buyCourse(courseId) {
    const user = getCurrentSession();
    const course = availableCourses.find(c => c.id === courseId);

    if (!user || !course) return;

    const currentCoins = user.coins || 0;

    if (currentCoins < course.price) {
        alert("❌ رصيدك من العملات غير كافٍ! قم بشحن الرصيد أولاً من قسم الحساب.");
        switchTab('profile');
        return;
    }

    if (confirm(`هل ترغب في خصم ${course.price} عملة لشراء ${course.title}؟`)) {
        const newBalance = currentCoins - course.price;
        user.coins = newBalance;
        user.purchasedCourses = user.purchasedCourses || [];
        if (!user.purchasedCourses.includes(courseId)) {
            user.purchasedCourses.push(courseId);
        }

        localStorage.setItem('currentUser', JSON.stringify(user));
        updateCoinsDisplay(newBalance);
        renderCourses();

        alert("✅ تم شراء الكورس بنجاح!");
        openCourse(courseId);

        if (typeof database !== 'undefined' && user.phone) {
            database.ref('students/' + user.phone).update({
                coins: newBalance,
                purchasedCourses: user.purchasedCourses
            }).catch(err => console.error(err));

            if (typeof logStudentUpdate === 'function') {
                logStudentUpdate("شراء كورس جديد", { courseId: course.id, price: course.price, remainingBalance: newBalance });
            }
        }
    }
}

function openCourse(courseId) {
    const course = availableCourses.find(c => c.id === courseId);
    if (!course) return;

    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    const section = document.getElementById("courseContentSection");
    section.classList.remove("hidden");
    section.scrollIntoView({ behavior: 'smooth' });

    document.getElementById("courseTitle").innerText = course.title;
    const playlist = document.getElementById("playlistItems");
    playlist.innerHTML = "";

    course.videos.forEach((vid, index) => {
        const item = document.createElement("div");
        item.className = "playlist-item";
        item.innerHTML = `<span>🎥 ${vid.title}</span> <span style="font-size:0.8rem; color:var(--accent-neon);">تشغيل ▶</span>`;
        item.onclick = () => {
            playVideo(vid.url);
        };
        playlist.appendChild(item);
    });

    if (course.videos.length > 0) {
        playVideo(course.videos[0].url);
    }
}

function playVideo(url) {
    const video = document.getElementById("mainVideo");
    if (video) {
        video.src = url;
        video.play().catch(e => console.log("Auto-play blocked:", e));
    }
}

async function submitRechargeCode() {
    const codeInput = document.getElementById('rechargeCodeInput');
    const code = codeInput.value.trim().toUpperCase();
    const msg = document.getElementById('rechargeMsg');
    const user = getCurrentSession();

    if (!code) {
        msg.style.color = "var(--danger)";
        msg.innerText = "⚠️ يرجى كتابة كود الشحن أولاً!";
        return;
    }

    msg.style.color = "var(--accent-neon)";
    msg.innerText = "⏳ جاري التحقق من الكود...";

    if (typeof checkAndActivateRechargeCode === 'function') {
        const res = await checkAndActivateRechargeCode(code, user.phone);
        if (res.success) {
            updateCoinsDisplay(res.totalCoins);
            msg.style.color = "var(--success)";
            msg.innerText = `✅ تم شحن ${res.addedCoins} عملة بنجاح! رصيدك الحالي: ${res.totalCoins} عملة`;
            codeInput.value = "";
            renderCourses();
        } else {
            msg.style.color = "var(--danger)";
            msg.innerText = res.msg || "❌ كود الشحن غير صحيح أو تم استخدامه مسبقاً!";
        }
    }
}

function loadProfileData() {
    const user = getCurrentSession() || {};
    const nameInput = document.getElementById('profNameInput');
    const phoneInput = document.getElementById('profPhoneInput');
    const parentPhoneInput = document.getElementById('profParentPhoneInput');
    const genderInput = document.getElementById('profGenderInput');
    const religionInput = document.getElementById('profReligionInput');
    const gradeInput = document.getElementById('profGradeInput');

    if (nameInput) nameInput.value = user.name || "";
    if (phoneInput) phoneInput.value = user.phone || "";
    if (parentPhoneInput) parentPhoneInput.value = user.parentPhone || "";
    if (genderInput) genderInput.value = user.gender || "ذكر";
    if (religionInput) religionInput.value = user.religion || "مسلم";
    if (gradeInput) gradeInput.value = user.grade || "الصف الأول الثانوي";
}

async function saveProfileChanges() {
    const user = getCurrentSession();
    const newName = document.getElementById('profNameInput').value.trim();
    const newParentPhone = document.getElementById('profParentPhoneInput').value.trim();
    const newGender = document.getElementById('profGenderInput').value;
    const newReligion = document.getElementById('profReligionInput').value;
    const newGrade = document.getElementById('profGradeInput').value;
    const msg = document.getElementById('profileMsg');

    if (!newName || !newParentPhone) {
        msg.style.color = "var(--danger)";
        msg.innerText = "⚠️ يرجى ملء جميع الحقول المطلوبة!";
        return;
    }

    user.name = newName;
    user.parentPhone = newParentPhone;
    user.gender = newGender;
    user.religion = newReligion;
    user.grade = newGrade;

    localStorage.setItem('currentUser', JSON.stringify(user));
    msg.style.color = "var(--success)";
    msg.innerText = "✅ تم حفظ التعديلات وتحديث الصف الدراسي بنجاح!";

    renderCourses();

    if (typeof database !== 'undefined' && user.phone) {
        database.ref('students/' + user.phone).update({
            fullName: newName,
            parentPhone: newParentPhone,
            gender: newGender,
            religion: newReligion,
            grade: newGrade
        }).catch(e => console.error(e));
    }
}

function logout() {
    if (typeof destroySession === 'function') {
        destroySession();
    } else {
        localStorage.removeItem('currentUser');
        window.location.replace('login.html');
    }
}

function toggleAdminPanel() {
    const adminSec = document.getElementById("adminSection");
    if (adminSec) adminSec.classList.toggle("hidden");
}

async function generateCodes() {
    const coinsValue = parseInt(document.getElementById("adminCoinsValue").value) || 50;
    const count = parseInt(document.getElementById("adminCodeCount").value) || 3;
    let generated = [];

    for (let i = 0; i < count; i++) {
        const code = `COIN-${coinsValue}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        if (typeof generateAndSaveCode === 'function') {
            await generateAndSaveCode(code, coinsValue);
        }
        generated.push(code);
    }

    const listEl = document.getElementById("generatedCodesList");
    if (listEl) {
        listEl.innerHTML = "<strong>الأكواد المُولدة والمحفوظة في قاعدة البيانات:</strong><br>" + generated.join("<br>");
    }
}

function limitPhoneLength(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
    if (input.value.length > 11) {
        input.value = input.value.slice(0, 11);
    }
}
