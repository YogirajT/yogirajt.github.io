// ------- VARS ------- //
let ticking = false;
let isFirefox = /Firefox/i.test(navigator.userAgent);
let isIe =
  /MSIE/i.test(navigator.userAgent) ||
  /Trident.*rv\:11\./i.test(navigator.userAgent);
let scrollSensitivitySetting = 30; //Increase/decrease  to change sensitivity
let slideDurationSetting = 600; //Amount of time for which slide is "locked"
let currentSlideNumber = 0;
let totalSlideNumber = $(".background").length;
const animationSubclass = "animation";
let lastY // Used to determine touch direction;

// ------- PARALLAX SCROLL FUNCTION ------- //
function parallaxScroll(evt) {
  if (evt.type === "touchmove"){
    let currentY = evt.touches[0].clientY;
    if(currentY > lastY){
        delta = -120
    } else {
        delta = 120
    }
    lastY = currentY;
  } else if (isFirefox) {
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

    // Set animation class for current slide and remove others to trigger animation
    $(".background").eq(currentSlideNumber).addClass(animationSubclass);
    $(".background").each(function (idx) {
      if (idx !== currentSlideNumber) {
        $( this ).removeClass(animationSubclass);
      }
    });
  }
}

// ------- SET TIMEOUT TO TEMPORARILY "LOCK" SLIDES ------- //
function slideDurationTimeout(slideDuration) {
  setTimeout(function () {
    ticking = false;
  }, slideDuration);
}

// ------- ADD EVENT LISTENER ------- //
let mousewheelEvent = isFirefox ? "DOMMouseScroll" : "wheel";
window.addEventListener(mousewheelEvent, _.throttle(parallaxScroll, 60), false);

let touchEvent = "touchmove"
window.addEventListener(touchEvent, _.throttle(parallaxScroll, 60), false);

// ------- SLIDE MOTION ------- //
function nextItem() {
  let $previousSlide = $(".background").eq(currentSlideNumber - 1);
  $previousSlide.removeClass("up-scroll").addClass("down-scroll");
}

function previousItem() {
  let $currentSlide = $(".background").eq(currentSlideNumber);
  $currentSlide.removeClass("down-scroll").addClass("up-scroll");
}


// ------- INITIALIZE ------- //

$(".background").eq(currentSlideNumber).toggleClass(animationSubclass); // Set animation class for first slide

$(".content-subtitle-2").on(touchEvent, (e) => { e.stopPropagation() }); // Stop the propagation for skills list as it may have an internal scroll.
