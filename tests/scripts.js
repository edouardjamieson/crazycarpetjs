// const CrazyCarpet = require('../src/js/crazycarpet');
import CrazyCarpet from '../src/js/crazycarpet.js';

window.addEventListener('load', () => {
	const el = document.querySelector('.crazycarpet#cc1');
	const cc = new CrazyCarpet(el, {
		clamp: {
			enabled: true,
		},
	});
});
