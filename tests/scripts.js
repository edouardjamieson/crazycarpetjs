// const CrazyCarpet = require('../src/js/crazycarpet');
import CrazyCarpet from '../src/js/crazycarpet.js';

window.addEventListener('load', () => {
	const el = document.querySelector('.crazycarpet#cc1');
	const cc = new CrazyCarpet(el, {
		// loop: true,
		// snap: true,
		clamp: {
			enabled: true,
		},
		buttons: {
			prev: '#prev',
			next: '#next',
		},
		mobile_block: true,
	});
});

function xd() {
	console.log('xd');
}
