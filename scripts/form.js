
// 조건부 질문 활성화
const satisfactionRadios = document.querySelectorAll('input[name="satisfaction"]');

const positiveGroup = document.getElementById('positiveGroup');
const negativeGroup = document.getElementById('negativeGroup');

satisfactionRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        const selectedValue = this.value;
        
        if (selectedValue === '매우만족' || selectedValue === '만족') {
            positiveGroup.style.display = 'block';
            negativeGroup.style.display = 'none';
        } else if (selectedValue === '보통' || selectedValue === '불만족' || selectedValue === '매우불만족') {
            positiveGroup.style.display = 'none';
            negativeGroup.style.display = 'block';
        }
    });
});

// 각 버튼 이벤트
const form = document.querySelector("form");

const submitBtn = document.querySelector(".submitBtn");
const resetBtn = document.querySelector(".resetBtn");
const topBtn = document.querySelector(".topBtn");

submitBtn.addEventListener("click", function (e) {
    e.preventDefault();

    if (form.checkValidity()) {
        const result = confirm("제출하시겠습니까?");

        if (result) {
            alert("제출되었습니다. 소중한 의견 감사합니다!");
            form.reset();
        }

    } else {
        form.reportValidity();
    }
});

resetBtn.addEventListener("click", function (e) {
    e.preventDefault();
    const result = confirm("입력한 내용을 모두 초기화하시겠습니까?");
    if (result) {
        form.reset();
    }
});

topBtn.addEventListener("click", function () {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});