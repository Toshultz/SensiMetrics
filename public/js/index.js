console.log('running index script');

$('.toggle').on('click', function() {
	console.log('toggling');
  $('.container').stop().addClass('active');
});

$('.close').on('click', function() {
  $('.container').stop().removeClass('active');
});