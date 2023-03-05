document.body.className += ' js-enabled';

// ------------- letIABLES ------------- //
let ticking = false;
let isFirefox = /Firefox/i.test(navigator.userAgent);
let isIe =
  /MSIE/i.test(navigator.userAgent) ||
  /Trident.*rv\:11\./i.test(navigator.userAgent);
let scrollSensitivitySetting = 30; //Increase/decrease this number to change sensitivity to trackpad gestures (up = less sensitive; down = more sensitive)
let slideDurationSetting = 600; //Amount of time for which slide is "locked"
let currentSlideNumber = 0;
let totalSlideNumber = $(".background").length;

// ------------- DETERMINE DELTA/SCROLL DIRECTION ------------- //
function parallaxScroll(evt) {
  if (isFirefox) {
    //Set delta for Firefox
    delta = evt.detail * -120;
  } else if (isIe) {
    //Set delta for IE
    delta = -evt.deltaY;
  } else {
    //Set delta for all other browsers
    delta = evt.wheelDelta;
  }

  if (ticking != true) {
    if (delta <= -scrollSensitivitySetting) {
      //Down scroll
      ticking = true;
      if (currentSlideNumber !== totalSlideNumber - 1) {
        currentSlideNumber++;
        nextItem();
      }
      slideDurationTimeout(slideDurationSetting);
    }
    if (delta >= scrollSensitivitySetting) {
      //Up scroll
      ticking = true;
      if (currentSlideNumber !== 0) {
        currentSlideNumber--;
      }
      previousItem();
      slideDurationTimeout(slideDurationSetting);
    }
  }
}

// ------------- SET TIMEOUT TO TEMPORARILY "LOCK" SLIDES ------------- //
function slideDurationTimeout(slideDuration) {
  setTimeout(function () {
    ticking = false;
  }, slideDuration);
}

// ------------- ADD EVENT LISTENER ------------- //
let mousewheelEvent = isFirefox ? "DOMMouseScroll" : "wheel";
window.addEventListener(mousewheelEvent, _.throttle(parallaxScroll, 60), false);

let touchEvent = "touchmove"
window.addEventListener(touchEvent, _.throttle(parallaxScroll, 60), false);

// ------------- SLIDE MOTION ------------- //
function nextItem() {
  let $previousSlide = $(".background").eq(currentSlideNumber - 1);
  $previousSlide.removeClass("up-scroll").addClass("down-scroll");
}

function previousItem() {
  let $currentSlide = $(".background").eq(currentSlideNumber);
  $currentSlide.removeClass("down-scroll").addClass("up-scroll");
}

const animatedClassSelectors = [
  ...Array(3)
    .fill(".content-title")
    .map((className, i) => `${className}-${i + 1}`),
  ...Array(3)
    .fill(".content-subtitle")
    .map((className, i) => `${className}-${i + 1}`),
];

const animationSubclass = "animation";

for (const className of animatedClassSelectors) {
  const element = document.querySelector(className);
  const observer = new IntersectionObserver((entries) => {
    element.classList.toggle(animationSubclass, entries[0].isIntersecting);
  });
  observer.observe(element);
}
