$.fn.extend({
  treed: function (o) {
    
    var openedClass = 'fa-minus';
    var closedClass = 'fa-plus';
    
    if (typeof o != 'undefined'){
      if (typeof o.openedClass != 'undefined'){
      openedClass = o.openedClass;
      }
      if (typeof o.closedClass != 'undefined'){
      closedClass = o.closedClass;
      }
    };
    
      //initialize each of the top levels
      var tree = $(this);
      tree.addClass("tree");
      tree.find('li').has("ul").has("li").each(function () {
          var branch = $(this); //li with children ul
          if(branch.children("I").length === 0){
            branch.prepend("<i class='indicator fa " + closedClass + "'></i>");
           }  
        branch.addClass('branch');
        branch.off('click');
        branch.on('click', function (e) {
            if (this == e.target) {
                var icon = $(this).children('i:first');
                icon.toggleClass(openedClass + " " + closedClass);
                $(this).children().children(':not(input)').toggle();
            }
        });
        if(branch.children("I").length >= 0){
            branch.children('i:first').removeClass(openedClass).addClass(closedClass);
        } 
        branch.children().children().hide();
      });
    //fire event from the dynamically added icon
    tree.find('.branch .indicator').each(function(){
      $(this).off('click');
      $(this).on('click', function () {
          $(this).closest('li').click();
      });
    });
      //fire event to open branch if the li contains an anchor instead of text
      tree.find('.branch>a').each(function () {
          $(this).off('click');
          $(this).on('click', function (e) {
              $(this).closest('li').click();
              e.preventDefault();
          });
      });
      //fire event to open branch if the li contains a button instead of text
      tree.find('.branch>button').each(function () {
          $(this).off('click');
          $(this).on('click', function (e) {
              $(this).closest('li').click();
              e.preventDefault();
          });
      });
  }
});