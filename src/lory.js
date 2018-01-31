/* globals jQuery */

import detectPrefixes from './utils/detect-prefixes.js';
import dispatchEvent from './utils/dispatch-event.js';
import defaults from './defaults.js';

const slice = Array.prototype.slice;

export function lory (slider, opts) {
        var position = void 0;
        var slidesWidth = void 0;
        var frameWidth = void 0;
        var slides = void 0;

        /**
         * slider DOM elements
         */
        var frame = void 0;
        var slideContainer = void 0;
        var prevCtrl = void 0;
        var nextCtrl = void 0;
        var dotContainer = void 0;
        var prefixes = void 0;
        var transitionEndCallback = void 0;

        var index = 0;
        var options = {};

        var autoAdvanceTimeout = void 0;

        /**
         * if object is jQuery convert to native DOM element
         */
        if (typeof jQuery !== 'undefined' && slider instanceof jQuery) {
          slider = slider[0];
        }

        /**
         * private
         * set active class to element which is the current slide
         */
        function setActiveElement(slides, currentIndex) {
          var _options = options,
            classNameActiveSlide = _options.classNameActiveSlide;


          slides.forEach(function (element, index) {
            if (element.classList.contains(classNameActiveSlide)) {
              element.classList.remove(classNameActiveSlide);
            }
          });

          slides[currentIndex].classList.add(classNameActiveSlide);
        }

        /**
         * private
         * setupInfinite: function to setup if infinite is set
         *
         * @param  {array} slideArray
         * @return {array} array of updated slideContainer elements
         */
        function setupInfinite(slideArray) {
          var _options2 = options,
            infinite = _options2.infinite;

          var front = slideArray.slice(0, infinite);
          var back = slideArray.slice(slideArray.length - infinite, slideArray.length);

          if (!front[0].classList.contains('auto-play-slide') && !back[0].classList.contains('auto-play-slide')) {
            front.forEach(function (element) {
              var cloned = element.cloneNode(true);
              cloned.classList.add('auto-play-slide')
              slideContainer.appendChild(cloned);
            });

            back.reverse().forEach(function (element) {
              var cloned = element.cloneNode(true);
              cloned.classList.add('auto-play-slide')
              slideContainer.insertBefore(cloned, slideContainer.firstChild);
            });

            slideContainer.addEventListener(prefixes.transitionEnd, onTransitionEnd);
          }

          return slice.call(slideContainer.children);
        }

        /**
         * [dispatchSliderEvent description]
         * @return {[type]} [description]
         */
        function dispatchSliderEvent(phase, type, detail) {
          (0, _dispatchEvent2.default)(slider, phase + '.lory.' + type, detail);
        }

        /**
         * translates to a given position in a given time in milliseconds
         *
         * @to        {number} number in pixels where to translate to
         * @duration  {number} time in milliseconds for the transistion
         * @ease      {string} easing css property
         */
        function translate(to, duration, ease) {
          var style = slideContainer && slideContainer.style;

          if (style) {
            style[prefixes.transition + 'TimingFunction'] = ease;
            style[prefixes.transition + 'Duration'] = duration + 'ms';

            if (prefixes.hasTranslate3d) {
              style[prefixes.transform] = 'translate3d(' + to + 'px, 0, 0)';
            } else {
              style[prefixes.transform] = 'translate(' + to + 'px, 0)';
            }
          }
        }

        /**
         * slidefunction called by prev, next & touchend
         *
         * determine nextIndex and slide to next postion
         * under restrictions of the defined options
         *
         * @direction  {boolean}
         */
        function slide(nextIndex, direction) {
          var _options3 = options,
            slideSpeed = _options3.slideSpeed,
            slidesToScroll = _options3.slidesToScroll,
            infinite = _options3.infinite,
            rewind = _options3.rewind,
            rewindSpeed = _options3.rewindSpeed,
            ease = _options3.ease,
            classNameActiveSlide = _options3.classNameActiveSlide;


          var duration = slideSpeed;

          var nextSlide = direction ? index + 1 : index - 1;
          var maxOffset = Math.round(slidesWidth - frameWidth);

          dispatchSliderEvent('before', 'slide', {
            index: index,
            nextSlide: nextSlide
          });

          /**
           * Reset control classes
           */
          if (prevCtrl) {
            prevCtrl.classList.remove('disabled');
          }
          if (nextCtrl) {
            nextCtrl.classList.remove('disabled');
          }

          if (typeof nextIndex !== 'number') {
            if (direction) {
              nextIndex = index + slidesToScroll;
            } else {
              nextIndex = index - slidesToScroll;
            }

            nextIndex = Math.min(Math.max(nextIndex, 0), slides.length - 1);
            if (infinite && direction === undefined) {
              nextIndex += infinite;
            }
          } else {
            nextIndex = Math.min(Math.max(nextIndex, 0), slides.length - 1);
          }

          var nextOffset = Math.min(Math.max(slides[nextIndex].offsetLeft * -1, maxOffset * -1), 0);

          if (rewind && Math.abs(position.x) === maxOffset && direction) {
            nextOffset = 0;
            nextIndex = 0;
            duration = rewindSpeed;
          }

          /**
           * translate to the nextOffset by a defined duration and ease function
           */
          translate(nextOffset, duration, ease);

          /**
           * update the position with the next position
           */
          position.x = nextOffset;

          /**
           * update the index with the nextIndex only if
           * the offset of the nextIndex is in the range of the maxOffset
           */
          if (slides[nextIndex].offsetLeft <= maxOffset) {
            index = nextIndex;
          }

          if (infinite && (nextIndex === slides.length - infinite || nextIndex === 0)) {
            if (direction) {
              index = infinite;
            }

            if (!direction) {
              index = slides.length - infinite * 2;
            }

            position.x = slides[index].offsetLeft * -1;

            transitionEndCallback = function transitionEndCallback() {
              translate(slides[index].offsetLeft * -1, 0, undefined);
            };
          }

          if (classNameActiveSlide) {
            setActiveElement(slice.call(slides), index);
          }

          /**
           * update classes for next and prev arrows
           * based on user settings
           */
          if (prevCtrl && !infinite && nextIndex === 0) {
            prevCtrl.classList.add('disabled');
          }

          if (nextCtrl && !infinite && !rewind && nextIndex + 1 === slides.length) {
            nextCtrl.classList.add('disabled');
          }

          if (options.autoAdvance) {
            clearTimeout(autoAdvanceTimeout);
            // Change these values to change the slider direction and delay.
            autoAdvanceTimeout = setTimeout(next, options.autoAdvance);
          }

          if (options.classNameDotContainer) {
            setActiveDot(index);
          }
          dispatchSliderEvent('after', 'slide', {
            currentSlide: index
          });
        }

        /**
         * public
         * setup function
         */
        function setup(updatedOptions) {
          dispatchSliderEvent('before', 'init');
          prefixes = (0, _detectPrefixes2.default)();
          options = _extends({}, _defaults2.default, opts);
          options = _extends({}, options, updatedOptions);

          var _options4 = options,
            classNameFrame = _options4.classNameFrame,
            classNameSlideContainer = _options4.classNameSlideContainer,
            classNamePrevCtrl = _options4.classNamePrevCtrl,
            classNameNextCtrl = _options4.classNameNextCtrl,
            enableMouseEvents = _options4.enableMouseEvents,
            classNameActiveSlide = _options4.classNameActiveSlide,
            classNameDotContainer = _options4.classNameDotContainer;


          frame = slider.getElementsByClassName(classNameFrame)[0];
          slideContainer = frame.getElementsByClassName(classNameSlideContainer)[0];
          prevCtrl = slider.getElementsByClassName(classNamePrevCtrl)[0];
          nextCtrl = slider.getElementsByClassName(classNameNextCtrl)[0];

          position = {
            x: slideContainer.offsetLeft,
            y: slideContainer.offsetTop
          };

          if (options.autoAdvance) {
            options.rewind = false;
            options.infinite = options.infinite || 1;
          }

          if (classNameDotContainer) {
            dotContainer = slider.getElementsByClassName(classNameDotContainer)[0];

            if (dotContainer) {
              dotContainer.innerHTML = '';

              var i = 0, len = slice.call(slideContainer.children).length

              var front = slice.call(slideContainer.children)[0];

              for (i = 0; i < len; i++) {
                if (i === 0 && front.classList.contains('auto-play-slide')) {
                  i = 1
                  len = slice.call(slideContainer.children).length - 1
                }
                var dot = document.createElement('li');
                // Use function to make event listener so `i` becomes immutable
                (function (_i) {
                  dot.addEventListener('click', function (e) {
                    slideTo(_i);
                  });
                })(i);
                dotContainer.appendChild(dot);
              }
              dotContainer.childNodes[0].classList.add('active');
            }
          } else if (dotContainer) {
            dotContainer.innerHTML = '';
          }

          if (options.infinite) {
            slides = setupInfinite(slice.call(slideContainer.children));
          } else {
            var slideArray = slice.call(slideContainer.children);
            var front = slideArray[0];
            if (front.classList.contains('auto-play-slide')) {
              slideContainer.removeChild(slideContainer.firstChild)
              slideContainer.removeChild(slideContainer.lastChild)
            }

            slides = slice.call(slideContainer.children);

            if (prevCtrl) {
              prevCtrl.classList.add('disabled');
            }

            if (nextCtrl && slides.length === 1 && !options.rewind) {
              nextCtrl.classList.add('disabled');
            }
          }

          reset();

          if (classNameActiveSlide) {
            setActiveElement(slides, index);
          }

          if (prevCtrl && nextCtrl) {
            prevCtrl.addEventListener('click', prev);
            nextCtrl.addEventListener('click', next);
          }

          frame.addEventListener('touchstart', onTouchstart);

          if (enableMouseEvents) {
            frame.addEventListener('mousedown', onTouchstart);
            frame.addEventListener('click', onClick);
          }

          options.window.addEventListener('resize', onResize);

          if (options.autoAdvance) {
            slideTo(0);
          }

          dispatchSliderEvent('after', 'init');
        }

        /**
         * public
         * reset function: called on resize
         */
        function reset() {
          var _options5 = options,
            infinite = _options5.infinite,
            ease = _options5.ease,
            rewindSpeed = _options5.rewindSpeed,
            rewindOnResize = _options5.rewindOnResize,
            classNameActiveSlide = _options5.classNameActiveSlide;


          slidesWidth = slideContainer.getBoundingClientRect().width || slideContainer.offsetWidth;
          frameWidth = frame.getBoundingClientRect().width || frame.offsetWidth;

          if (frameWidth === slidesWidth) {
            slidesWidth = slides.reduce(function (previousValue, slide) {
              return previousValue + slide.getBoundingClientRect().width || slide.offsetWidth;
            }, 0);
          }

          if (rewindOnResize) {
            index = 0;
          } else {
            ease = null;
            rewindSpeed = 0;
          }

          if (infinite) {
            translate(slides[index + infinite].offsetLeft * -1, 0, null);

            index = index + infinite;
            position.x = slides[index].offsetLeft * -1;
          } else {
            translate(slides[index].offsetLeft * -1, rewindSpeed, ease);
            position.x = slides[index].offsetLeft * -1;
          }

          if (classNameActiveSlide) {
            setActiveElement(slice.call(slides), index);
          }
        }

        /**
         * public
         * slideTo: called on clickhandler
         */
        function slideTo(index) {
          slide(index);
        }

        /**
         * public
         * returnIndex function: called on clickhandler
         */
        function returnIndex() {
          return index - options.infinite || 0;
        }

        /**
         * public
         * prev function: called on clickhandler
         */
        function prev() {
          slide(false, false);
        }

        /**
         * public
         * next function: called on clickhandler
         */
        function next() {
          slide(false, true);
        }

        /**
         * public
         * destroy function: called to gracefully destroy the lory instance
         */
        function destroy() {
          dispatchSliderEvent('before', 'destroy');

          // remove event listeners
          frame.removeEventListener(prefixes.transitionEnd, onTransitionEnd);
          frame.removeEventListener('touchstart', onTouchstart);
          frame.removeEventListener('touchmove', onTouchmove);
          frame.removeEventListener('touchend', onTouchend);
          frame.removeEventListener('mousemove', onTouchmove);
          frame.removeEventListener('mousedown', onTouchstart);
          frame.removeEventListener('mouseup', onTouchend);
          frame.removeEventListener('mouseleave', onTouchend);
          frame.removeEventListener('click', onClick);

          options.window.removeEventListener('resize', onResize);

          if (prevCtrl) {
            prevCtrl.removeEventListener('click', prev);
          }

          if (nextCtrl) {
            nextCtrl.removeEventListener('click', next);
          }

          // remove cloned slides if infinite is set
          if (options.infinite) {
            Array.apply(null, Array(options.infinite)).forEach(function () {
              slideContainer.removeChild(slideContainer.firstChild);
              slideContainer.removeChild(slideContainer.lastChild);
            });
          }

          if (options.autoAdvance) {
            clearTimeout(autoAdvanceTimeout);
          }

          dispatchSliderEvent('after', 'destroy');
        }

        // event handling

        var touchOffset = void 0;
        var delta = void 0;
        var isScrolling = void 0;

        function onTransitionEnd() {
          if (transitionEndCallback) {
            transitionEndCallback();

            transitionEndCallback = undefined;
          }
        }

        function onTouchstart(event) {
          var _options6 = options,
            enableMouseEvents = _options6.enableMouseEvents;

          var touches = event.touches ? event.touches[0] : event;

          if (enableMouseEvents) {
            frame.addEventListener('mousemove', onTouchmove);
            frame.addEventListener('mouseup', onTouchend);
            frame.addEventListener('mouseleave', onTouchend);
          }

          frame.addEventListener('touchmove', onTouchmove);
          frame.addEventListener('touchend', onTouchend);

          var pageX = touches.pageX,
            pageY = touches.pageY;


          touchOffset = {
            x: pageX,
            y: pageY,
            time: Date.now()
          };

          isScrolling = undefined;

          delta = {};

          dispatchSliderEvent('on', 'touchstart', {
            event: event
          });
        }

        function onTouchmove(event) {
          var touches = event.touches ? event.touches[0] : event;
          var pageX = touches.pageX,
            pageY = touches.pageY;


          delta = {
            x: pageX - touchOffset.x,
            y: pageY - touchOffset.y
          };

          if (typeof isScrolling === 'undefined') {
            isScrolling = !!(isScrolling || Math.abs(delta.x) < Math.abs(delta.y));
          }

          if (!isScrolling && touchOffset) {
            event.preventDefault();
            translate(position.x + delta.x, 0, null);
          }

          // may be
          dispatchSliderEvent('on', 'touchmove', {
            event: event
          });
        }

        function onTouchend(event) {
          /**
           * time between touchstart and touchend in milliseconds
           * @duration {number}
           */
          var duration = touchOffset ? Date.now() - touchOffset.time : undefined;

          /**
           * is valid if:
           *
           * -> swipe attempt time is over 300 ms
           * and
           * -> swipe distance is greater than 25px
           * or
           * -> swipe distance is more then a third of the swipe area
           *
           * @isValidSlide {Boolean}
           */
          var isValid = Number(duration) < 300 && Math.abs(delta.x) > 25 || Math.abs(delta.x) > frameWidth / 3;

          /**
           * is out of bounds if:
           *
           * -> index is 0 and delta x is greater than 0
           * or
           * -> index is the last slide and delta is smaller than 0
           *
           * @isOutOfBounds {Boolean}
           */
          var isOutOfBounds = !index && delta.x > 0 || index === slides.length - 1 && delta.x < 0;

          var direction = delta.x < 0;

          if (!isScrolling) {
            if (isValid && !isOutOfBounds) {
              slide(false, direction);
            } else {
              translate(position.x, options.snapBackSpeed);
            }
          }

          touchOffset = undefined;

          /**
           * remove eventlisteners after swipe attempt
           */
          frame.removeEventListener('touchmove', onTouchmove);
          frame.removeEventListener('touchend', onTouchend);
          frame.removeEventListener('mousemove', onTouchmove);
          frame.removeEventListener('mouseup', onTouchend);
          frame.removeEventListener('mouseleave', onTouchend);

          dispatchSliderEvent('on', 'touchend', {
            event: event
          });
        }

        function onClick(event) {
          if (delta.x) {
            event.preventDefault();
          }
        }

        function setActiveDot(dotIndex) {
          var nDots = dotContainer.childNodes.length;
          for (var i = 0, len = nDots; i < len; i++) {
            dotContainer.childNodes[i].classList.remove('active');
          }
          dotIndex -= options.infinite || 0;
          if (dotIndex < nDots) {
            dotContainer.childNodes[dotIndex].classList.add('active');
          }
        }

        function onResize(event) {
          reset();
          if (options.classNameDotContainer) {
            setActiveDot(0);
          }
          dispatchSliderEvent('on', 'resize', {
            event: event
          });
        }

        // trigger initial setup
        setup();

        // expose public api
        return {
          setup: setup,
          reset: reset,
          slideTo: slideTo,
          returnIndex: returnIndex,
          prev: prev,
          next: next,
          destroy: destroy
        };
      }
