// 헤더 애니메이션
const header = document.querySelector("header");

window.addEventListener("scroll", () => {
  if (window.scrollY > 120) {
    header.classList.add("scrolled");
  }

  if (window.scrollY < 90) {
    header.classList.remove("scrolled");
  }
});

// 지도 장소
const mapPlaces = document.querySelectorAll(".map-place");
const detailsList = document.querySelectorAll(".details");

function closeAllDetails() {
  detailsList.forEach((details) => {
    details.style.display = "none";
  });
}

mapPlaces.forEach((mapPlace) => {
  const marker = mapPlace.querySelector(".map-marker");
  const details = mapPlace.querySelector(".details");
  const closeButton = mapPlace.querySelector(".close-details");

  marker.addEventListener("click", () => {
    closeAllDetails();
    details.style.display = "block";
  });

  closeButton.addEventListener("click", () => {
    details.style.display = "none";
  });
});

document.addEventListener("click", (event) => {
  const clickedInsideDetails = event.target.closest(".details");
  const clickedMarker = event.target.closest(".map-marker");

  if (!clickedInsideDetails && !clickedMarker) {
    closeAllDetails();
  }
});

