export default class CrazyCarpet {
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

		// Loop
		this.options.loop = options.loop || false;

		// Autoplay

		// Hooks

		// ====================================================================
		// Internal data
		// ====================================================================
		this.isDragging = false;
		this.isEasing = false;

		this.t = 0;
		this.old_t = 0;
		this.x = 0;
		this.move = 0;
		this.moves = [];
		this.start = 0;
		this.easing = this.options.drag.ease;
		this.overlap_x = null;

		this.clickable = null;

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

		// ====================================================================
		// Initial calls
		// ====================================================================
		this.dispose(0);
		this.render();
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

		console.log(e.clientX);

		// ====================================================================
		// Calculates position
		// ====================================================================
		this.move += (this.x - this.start) * this.options.drag.power;
		this.start = this.x;
		if (this.moves.length >= 30) this.moves.shift();
		this.moves.push({ speed: this.x, time: e.timeStamp });
		// this.isDragging = true;

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
		if (this.options.clamp && !this.options.loop && this.isDragging) this.checkOverlap(e);

		// ====================================================================
		// Call "onDrag" hook
		// ====================================================================
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
		this.overlap_x = null;

		this.element.classList.remove('__moving');
		this.element.querySelectorAll('.cc__item').forEach((el) => {
			el.style.pointerEvents = 'all';
			el.style.userSelect = 'auto';
			el.classList.remove('cc__handle');
		});
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
}
