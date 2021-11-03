$(function($) {
	let url = location.href;
	$('nav ul li a').each(function() {
		if (this.href === url) {
			$(this).addClass('active');
		}
	});

	let errorImage = $('.erImg');
	let errorText = $('.erText');

	if (errorText.text().length > 0) {
		errorImage.html('<img src="assets/images/icon/warning.png" alt=""> ');
	}
});
