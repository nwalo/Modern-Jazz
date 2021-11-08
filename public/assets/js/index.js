$(function($) {
	let url = location.href;
	$('nav ul li a').each(function() {
		if (this.href === url) {
			$(this).addClass('active');
		}
	});

	$('.sidebar ul.nav li a').each(function() {
		if (this.href === url) {
			$(this).parents('li').addClass('active');
		}
	});

	let errorImage = $('.erImg');
	let errorText = $('.erText');

	// console.log(errorText.text().length);
	$('p.success').hide();
	if (errorText.text().length > 0) {
		$('p.success').show();
		errorImage.html('<img src="assets/images/icon/warning.png" alt=""> ');
	}
});
