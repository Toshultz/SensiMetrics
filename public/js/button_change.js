console.log('running javascript');

$('.choosebutton').on('click', function() {
	console.log('choosebutton clicked');
  $('.cloudbutton').stop().removeClass('inactive');
  $('.choosebutton').stop().addClass('inactive');

});
