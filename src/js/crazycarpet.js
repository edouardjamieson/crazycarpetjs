export default class CrazyCarpet {
	static instances = [];

	/***
	 *
	 *      ####   ####  #    #  ####  ##### #####  #    #  ####  #####  ####  #####
	 *     #    # #    # ##   # #        #   #    # #    # #    #   #   #    # #    #
	 *     #      #    # # #  #  ####    #   #    # #    # #        #   #    # #    #
	 *     #      #    # #  # #      #   #   #####  #    # #        #   #    # #####
	 *     #    # #    # #   ## #    #   #   #   #  #    # #    #   #   #    # #   #
	 *      ####   ####  #    #  ####    #   #    #  ####   ####    #    ####  #    #
	 *
	 */
	constructor(element, options = {}) {
		// ====================================================================
		// Element
		// ====================================================================
		this.element = typeof element == 'string' ? document.querySelector(element) : element;
		if (!this.element) return this.error(`Element with selector ${element} is invalid.`);

		// ====================================================================
		// Data / options
		// ====================================================================
		this.options = {};

		// Debug
		this.options.debug = options?.debug || false;

		// Easing & dragging
		this.options.drag = {};
		this.options.drag.ease = options.drag?.ease || 0.1;
		this.options.drag.disabled = options.drag?.disabled || false;
		this.options.drag.power = options.drag?.power || 1;
		this.options.drag.type = options.drag?.type || 'linear';
		this.options.ease_power = options.ease_power || 10;

		// Clamping
		this.options.clamp = {};
		this.options.clamp.enabled = options.clamp?.enabled || false;
		this.options.clamp.resistance = options.clamp?.resistance || 300;

		// Snap
		this.options.snap = options.snap || false;

		// Loop
		this.options.loop = options.loop || false;

		// Autoplay

		// Hooks
		this.hooks = {};
		this.hooks.onInit = options.hooks?.onInit || false;
		this.hooks.onStart = options.hooks?.onStart || false;
		this.hooks.onDrag = options.hooks?.onDrag || false;
		this.hooks.onStop = options.hooks?.onStop || false;
		this.hooks.onClickable = options.hooks?.onClickable || false;
		this.hooks.onDestroy = options.hooks?.onDestroy || false;

		// Buttons
		this.buttons = {};
		this.buttons.prev = options.buttons?.prev || false;
		this.buttons.next = options.buttons?.next || false;

		// ====================================================================
		// Internal data
		// ====================================================================
		this.isDragging = false;
		this.isEasing = false;
		this.isMoving = false;

		this.t = 0;
		this.old_t = 0;
		this.x = 0;
		this.move = 0;
		this.moves = [];
		this.start = 0;
		this.easing = this.options.drag.ease;
		this.overlap_x = null;
		this.clickable = null;

		this.resize_timeout = null;

		// ====================================================================
		// Call to init function
		// ====================================================================
		this.init();
	}

	/***
	 *
	 *     # #    # # #####
	 *     # ##   # #   #
	 *     # # #  # #   #
	 *     # #  # # #   #
	 *     # #   ## #   #
	 *     # #    # #   #
	 *
	 */
	init() {
		// ====================================================================
		// Register event listeners
		// ====================================================================

		// Mouse events
		this.element.addEventListener('mousedown', this.move_start.bind(this));
		this.element.addEventListener('mousemove', this.move_drag.bind(this));
		this.element.addEventListener('mouseup', this.move_end.bind(this));
		this.element.addEventListener('mouseleave', () => {
			this.isDragging = false;
			this.move_end(null, false);
		});

		// Touch events
		this.element.addEventListener('touchstart', this.move_start.bind(this));
		this.element.addEventListener('touchmove', this.move_drag.bind(this));
		this.element.addEventListener('touchend', this.move_end.bind(this));
		this.element.addEventListener('touchleave', () => {
			this.isDragging = false;
			this.move_end(null, false);
		});

		// Buttons
		if (this.buttons.prev) {
			if (typeof this.buttons.prev == 'string') document.querySelector(this.buttons.prev).addEventListener('click', this.move_prev.bind(this));
			else this.buttons.prev.addEventListener('click', this.move_prev.bind(this));
		}
		if (this.buttons.next) {
			if (typeof this.buttons.next == 'string') document.querySelector(this.buttons.next).addEventListener('click', this.move_next.bind(this));
			else this.buttons.next.addEventListener('click', this.move_next.bind(this));
		}

		// Utils

		// ====================================================================
		// Check loop
		// ====================================================================
		if (this.options.loop) {
			this.checkLoop();
			if (this.options.snap) {
				// Set temporary ease
				const tmp_ease = this.options.ease;
				this.options.ease = 1;
				this.move_end(null, false);
				setTimeout(() => {
					this.options.ease = tmp_ease;
				});
			}
		} else this.element.classList.add('__start');

		// ====================================================================
		// Check fot buttons & links
		// ====================================================================
		this.element.querySelectorAll('a').forEach((el) => el.classList.add('cc__clickable'));
		this.element.querySelectorAll('button').forEach((el) => el.classList.add('cc__clickable'));

		// ====================================================================
		// Initial calls
		// ====================================================================
		this.dispose(0);
		this.render();
		CrazyCarpet.instances.push(this);

		// ====================================================================
		// Hook
		// ====================================================================
		this.hooks.onInit && typeof this.hooks.onInit == 'function' ? this.hooks.onInit() : null;
	}

	/***
	 *
	 *     #    #  ####  #    # ######     ####  #####   ##   #####  #####
	 *     ##  ## #    # #    # #         #        #    #  #  #    #   #
	 *     # ## # #    # #    # #####      ####    #   #    # #    #   #
	 *     #    # #    # #    # #              #   #   ###### #####    #
	 *     #    # #    #  #  #  #         #    #   #   #    # #   #    #
	 *     #    #  ####    ##   ######     ####    #   #    # #    #   #
	 *
	 */
	move_start(e) {
		// ====================================================================
		// Prevent unwanted start
		// ====================================================================
		if (navigator && navigator.maxTouchPoints < 1) e.preventDefault();
		if (e.which > 1) return;
		if (this.isDragging == true) return;
		if (this.options.drag.disabled == true) return;

		// ====================================================================
		// Check if target is clickable
		// ====================================================================
		if (e.target.classList.contains('cc__clickable')) this.clickable = e;

		// ====================================================================
		// Setup css
		// ====================================================================
		e.target.closest('.cc__item') ? e.target.closest('.cc__item').classList.add('cc__handle') : null;
		this.element.classList.add('__moving');
		this.element.querySelectorAll('.cc__item').forEach((el) => {
			el.style.pointerEvents = 'none';
			el.style.userSelect = 'none';
		});

		// ====================================================================
		// Empty user selection
		// ====================================================================
		if (window.getSelection) {
			if (window.getSelection().empty) window.getSelection().empty();
			else if (window.getSelection().removeAllRanges) window.getSelection().removeAllRanges();
		} else if (document.selection) document.selection.empty();

		// ====================================================================
		// Setup initial data
		// ====================================================================
		if (this.isEasing) this.move = this.old_t;
		this.start = e.clientX || e.touches[0].clientX;
		this.isDragging = true;

		// ====================================================================
		// Call "onStart" hook
		// ====================================================================
		this.hooks.onStart && typeof this.hooks.onStart == 'function' ? this.hooks.onStart() : null;
	}

	/***
	 *
	 *     #    #  ####  #    # ######    #####  #####    ##    ####
	 *     ##  ## #    # #    # #         #    # #    #  #  #  #    #
	 *     # ## # #    # #    # #####     #    # #    # #    # #
	 *     #    # #    # #    # #         #    # #####  ###### #  ###
	 *     #    # #    #  #  #  #         #    # #   #  #    # #    #
	 *     #    #  ####    ##   ######    #####  #    # #    #  ####
	 *
	 */
	move_drag(e) {
		// ====================================================================
		// Prevent unwated moves
		// ====================================================================
		if (!this.isDragging) return;

		this.x = e.clientX || e.touches[0].clientX;
		if (this.x < 0 || this.x > window.innerWidth) return;

		// ====================================================================
		// Calculates position
		// ====================================================================
		this.move += (this.x - this.start) * this.options.drag.power;
		this.start = this.x;
		if (this.moves.length >= 30) this.moves.shift();
		this.moves.push({ speed: this.x, time: e.timeStamp });
		this.isMoving = true;

		// ====================================================================
		// CSS class for element position
		// ====================================================================
		if (!this.options.loop) {
			// Check if at start
			if (this.move >= 0) this.element.classList.add('__start');
			else this.element.classList.remove('__start');

			// Check if at end
			if (this.move + this.getAllItemsWidth() <= this.element.getBoundingClientRect().width) this.element.classList.add('__end');
			else this.element.classList.remove('__end');
		}

		// ====================================================================
		// Check for overlap
		// ====================================================================
		if (this.options.clamp.enabled && !this.options.loop && this.isDragging) this.checkOverlap(e);

		// ====================================================================
		// Call "onDrag" hook
		// ====================================================================
		this.hooks.onDrag && typeof this.hooks.onDrag == 'function' ? this.hooks.onDrag() : null;
	}

	/***
	 *
	 *     #    #  ####  #    # ######    ###### #    # #####
	 *     ##  ## #    # #    # #         #      ##   # #    #
	 *     # ## # #    # #    # #####     #####  # #  # #    #
	 *     #    # #    # #    # #         #      #  # # #    #
	 *     #    # #    #  #  #  #         #      #   ## #    #
	 *     #    #  ####    ##   ######    ###### #    # #####
	 *
	 */
	move_end(e, shouldEase) {
		// ====================================================================
		// Calculate ease
		// ====================================================================
		if (shouldEase !== false) {
			let drag;
			let time;

			for (let i = this.moves.length - 1; i >= 0; i--) {
				if (e.timeStamp - this.moves[i].time > 30) {
					drag = this.moves[i].speed;
					time = this.moves[i].time;
					break;
				}
				if (i == 0) {
					drag = this.moves[0].speed;
					time = this.moves[0].time;
				}
			}

			if (drag === undefined && time === undefined) {
				drag = 0;
				time = 0;
			}

			// Check for action
			if (!this.isMoving && this.clickable) {
				this.clickable.returnValue = true;
				this.clickable.target.click();
			}

			// Calculate easing function
			const delta = Math.max(e.timeStamp - time, 1);
			const x = this.x;
			const move = x ? x - drag : this.moves[this.moves.length - 1].speed - drag;
			const direction = Math.sign(move);

			drag = Math.abs(drag);
			drag = x ? Math.sqrt(Math.pow(drag - x, 2)) : Math.sqrt(Math.pow(drag - this.moves[this.moves.length - 1].speed, 2));
			drag = (drag * 30) / delta;
			this.move += drag * direction * this.options.ease_power;
		}

		// ====================================================================
		// Check for snapping
		// ====================================================================
		if (this.options.snap && this.element.getBoundingClientRect().width != 0) {
			this.move = gsap.utils.snap(this.element.querySelector('.cc__item').getBoundingClientRect().width, this.move);
		}

		// ====================================================================
		// Check for clamping
		// ====================================================================
		if (this.options.clamp.enabled == true) {
			const cc_width = this.element.getBoundingClientRect().width;
			const clamps = [-this.getAllItemsWidth() + cc_width, 0];
			this.move = gsap.utils.clamp(clamps[0], clamps[1], this.move);
		}

		// ====================================================================
		// Reset move variables
		// ====================================================================
		this.isDragging = false;
		this.isMoving = false;
		this.overlap_x = null;

		this.element.classList.remove('__moving');
		this.element.querySelectorAll('.cc__item').forEach((el) => {
			el.style.pointerEvents = 'all';
			el.style.userSelect = 'auto';
			el.classList.remove('cc__handle');
		});

		// ====================================================================
		// Hook
		// ====================================================================
		this.hooks.onStop && typeof this.hooks.onStop == 'function' ? this.hooks.onStop() : null;
	}

	/***
	 *
	 *     #####  #    # ##### #####  ####  #    #  ####
	 *     #    # #    #   #     #   #    # ##   # #
	 *     #####  #    #   #     #   #    # # #  #  ####
	 *     #    # #    #   #     #   #    # #  # #      #
	 *     #    # #    #   #     #   #    # #   ## #    #
	 *     #####   ####    #     #    ####  #    #  ####
	 *
	 */

	move_prev() {
		this.move += this.element.querySelector('.cc__item').clientWidth;

		// ====================================================================
		// CSS class for element position
		// ====================================================================
		if (!this.options.loop) {
			// Check if at start
			if (this.move >= 0) this.element.classList.add('__start');
			else this.element.classList.remove('__start');

			// Check if at end
			if (this.move + this.getAllItemsWidth() <= this.element.getBoundingClientRect().width) this.element.classList.add('__end');
			else this.element.classList.remove('__end');
		}

		this.move_end(null, false);

		// ====================================================================
		// Hook
		// ====================================================================
		this.hooks.onClickable && typeof this.hooks.onClickable == 'function' ? this.hooks.onClickable() : null;
	}
	move_next() {
		this.move -= this.element.querySelector('.cc__item').clientWidth;

		// ====================================================================
		// CSS class for element position
		// ====================================================================
		if (!this.options.loop) {
			// Check if at start
			if (this.move >= 0) this.element.classList.add('__start');
			else this.element.classList.remove('__start');

			// Check if at end
			if (this.move + this.getAllItemsWidth() <= this.element.getBoundingClientRect().width) this.element.classList.add('__end');
			else this.element.classList.remove('__end');
		}

		this.move_end(null, false);

		// ====================================================================
		// Hook
		// ====================================================================
		this.hooks.onClickable && typeof this.hooks.onClickable == 'function' ? this.hooks.onClickable() : null;
	}

	/***
	 *
	 *     #####  #  ####  #####   ####   ####  ######
	 *     #    # # #      #    # #    # #      #
	 *     #    # #  ####  #    # #    #  ####  #####
	 *     #    # #      # #####  #    #      # #
	 *     #    # # #    # #      #    # #    # #
	 *     #####  #  ####  #       ####   ####  ######
	 *
	 */
	dispose(position) {
		let modifiers;
		const single_item_width = this.element.querySelector('.cc__item').getBoundingClientRect().width;
		const width = this.getAllItemsWidth();

		// If we loop
		if (this.options.loop) {
			modifiers = {
				x: (x, target) => {
					const pos = gsap.utils.wrap(-single_item_width, width - single_item_width, parseInt(x));

					return `${pos}px`;
				},
			};
		}

		// Disposes elements
		gsap.set(this.element.querySelectorAll('.cc__item'), {
			x: (i) => {
				return this.options.loop ? i * single_item_width + position : position;
			},
			modifiers: modifiers,
		});
	}

	/***
	 *
	 *     #####  ###### #    # #####  ###### #####
	 *     #    # #      ##   # #    # #      #    #
	 *     #    # #####  # #  # #    # #####  #    #
	 *     #####  #      #  # # #    # #      #####
	 *     #   #  #      #   ## #    # #      #   #
	 *     #    # ###### #    # #####  ###### #    #
	 *
	 */
	render() {
		// Calculate easing
		this.easing = this.isDragging ? 1 : this.options.drag.ease;

		// ====================================================================
		// Calculate final easing
		// ====================================================================
		if (!this.isDragging) {
			this.t = parseFloat(this.lerp(this.t, this.move, this.easing).toFixed(2));
		} else this.t = parseFloat(this.lerp(this.t, this.move, this.easing).toFixed(2));

		// console.log(this.t);

		this.dispose(this.t);

		// ====================================================================
		// Check if easing
		// ====================================================================
		if (!this.isDragging) {
			this.isEasing = this.t === this.old_t ? false : true;

			// Setup css classes
			if (this.isEasing) this.element.classList.add('__easing');
			else this.element.classList.remove('__easing');
		}

		this.old_t = this.t;
		requestAnimationFrame(this.render.bind(this));
	}

	/***
	 *
	 *      ####  #    # ###### #####  #        ##   #####
	 *     #    # #    # #      #    # #       #  #  #    #
	 *     #    # #    # #####  #    # #      #    # #    #
	 *     #    # #    # #      #####  #      ###### #####
	 *     #    #  #  #  #      #   #  #      #    # #
	 *      ####    ##   ###### #    # ###### #    # #
	 *
	 */
	checkOverlap(e) {
		const cc_width = this.element.getBoundingClientRect().width;
		const overlap_left = this.move > 0;
		const overlap_right = this.move + this.getAllItemsWidth() < cc_width;

		let pos = e.clientX || e.touches(0).clientX;

		// ====================================================================
		// Calculate elastic resistance
		// ====================================================================
		if (overlap_left) {
			if (this.overlap_x === null) this.overlap_x = pos;
			let dist = parseInt(pos - this.overlap_x);
			let x, ratio, factor;
			x = dist;
			ratio = x / this.options.clamp.resistance;
			factor = 1 / (ratio + 1);
			x *= factor;
			this.move = x;
		}

		if (overlap_right) {
			if (this.overlap_x === null) this.overlap_x = pos;
			let dist = parseInt(pos - this.overlap_x);
			let x, ratio, factor;
			let offset = -(this.getAllItemsWidth() - cc_width);
			x = dist;
			ratio = x / this.options.clamp.resistance;
			factor = 1 / (ratio - 1);
			x *= -factor;
			x = parseInt(x);
			this.move = x + offset;
		}
	}

	/***
	 *
	 *     ###### #####  #####   ####  #####   ####
	 *     #      #    # #    # #    # #    # #
	 *     #####  #    # #    # #    # #    #  ####
	 *     #      #####  #####  #    # #####       #
	 *     #      #   #  #   #  #    # #   #  #    #
	 *     ###### #    # #    #  ####  #    #  ####
	 *
	 */
	error(string) {}

	/***
	 *
	 *     #    # ##### # #       ####
	 *     #    #   #   # #      #
	 *     #    #   #   # #       ####
	 *     #    #   #   # #           #
	 *     #    #   #   # #      #    #
	 *      ####    #   # ######  ####
	 *
	 */

	// ====================================================================
	// Get all items width
	// ====================================================================
	getAllItemsWidth() {
		let w = 0;
		this.element.querySelectorAll('.cc__item').forEach((el) => (w += el.clientWidth));
		return w;
	}

	// ====================================================================
	// Calculate lerp function
	// ====================================================================
	lerp(vel1, vel2, time) {
		return vel1 * (1 - time) + vel2 * time;
	}

	// ====================================================================
	// Check loop
	// ====================================================================
	checkLoop() {
		console.log('xd');
		// Checks if all CC items fill CC element
		if (this.getAllItemsWidth() - this.element.querySelector('.cc__item').getBoundingClientRect().width < this.element.getBoundingClientRect().width) {
			let html = this.element.querySelector('.cc__wrapper').innerHTML;
			while (this.getAllItemsWidth() - this.element.querySelector('.cc__item').getBoundingClientRect().width < this.element.getBoundingClientRect().width) {
				this.element.querySelector('.cc__wrapper').innerHTML = this.element.querySelector('.cc__wrapper').innerHTML + html;
			}
		}
		//=========================================================
		// Adds style
		//=========================================================
		this.element.querySelectorAll('.cc__item').forEach((item) => {
			item.style.position = 'absolute';
			item.style.top = 0;
			item.style.left = 0;
		});
		this.element.querySelector('.cc__wrapper').style.minHeight = this.element.querySelector('.cc__item').clientHeight + 'px';
	}

	// ====================================================================
	// Destroy
	// ====================================================================
	destroy() {
		this.element.removeEventListener('mousedown', this.move_start.bind(this));
		this.element.removeEventListener('mousemove', this.move_drag.bind(this));
		this.element.removeEventListener('mouseup', this.move_end.bind(this));
		this.element.removeEventListener('touchstart', this.move_start.bind(this));
		this.element.removeEventListener('touchmove', this.move_drag.bind(this));
		this.element.removeEventListener('touchend', this.move_end.bind(this));

		if (this.buttons.prev) {
			if (typeof this.buttons.prev == 'string') document.querySelector(this.buttons.prev).removeEventListener('click', this.move_prev.bind(this));
			else this.buttons.prev.removeEventListener('click', this.move_prev.bind(this));
		}
		if (this.buttons.next) {
			if (typeof this.buttons.next == 'string') document.querySelector(this.buttons.next).removeEventListener('click', this.move_next.bind(this));
			else this.buttons.next.removeEventListener('click', this.move_next.bind(this));
		}

		CrazyCarpet.instances.splice(CrazyCarpet.instances.indexOf(this), 1);

		// ====================================================================
		// Hook
		// ====================================================================
		this.hooks.onDestroy && typeof this.hooks.onDestroy == 'function' ? this.hooks.onDestroy() : null;
	}
}
