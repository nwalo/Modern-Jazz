$(function($) {
	let url = location.href;
	$('nav ul li a').each(function() {
		if (this.href === url) {
			$(this).addClass('active');
		}
	});
});
