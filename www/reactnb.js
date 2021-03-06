$(document).on('click', '.input', function(e) {
  $('#command').val($(e.target).text());
  $('#command').select();
});

var maxZIndex = 100;
$(document).on('dragstart', '.past_command', function(e, ui) {
  $(this).data('dragStartOffset', $(this).offset());
  $(this).css({
    zIndex: maxZIndex++
  });
  $(this).addClass('detached');
  $('body>div').append(this);
  // Cause plot sizes to be sent, if necessary
  $(this).trigger('shown');
});
$(document).on('drag', '.past_command', function(e, ui) {
  var startOffset = $(this).data('dragStartOffset');
  $(this).css({
    position: 'fixed',
    top: startOffset.top + (ui.position.top - ui.originalPosition.top),
    left: startOffset.left + (ui.position.left - ui.originalPosition.left)
  });
});

$(document).keydown(function(e) {
  if (e.which == 75 && e.ctrlKey) { // Ctrl-K
    e.preventDefault();
    function remove(e) {
      Shiny.unbindAll(this);
      $(this).remove();
    }
    if (!e.shiftKey)
      $('.past_command:not(.detached)').hide('drop', remove);
    else
      $('.past_command').hide('drop', remove);
  }
  if (e.which == 71 && e.ctrlKey) { // Ctrl-G
    e.preventDefault();
    $('.past_command.detached').each(function() {
      var props = {};
      if (/^-/.test(this.style.top))
        props.top = 0;
      if (/^-/.test(this.style.left))
        props.left = 0;
      if (Object.keys(props).length > 0) {
        $(this).animate(props, 250);
      }
    });
  }
  if (e.which == 72 && e.ctrlKey) { // Ctrl-H
    e.preventDefault();
    $('html').toggleClass('viewonly');
  }
  if (e.which == 73 && e.ctrlKey) { // Ctrl-H
    e.preventDefault();
    $('html').toggleClass('hicontrast');
  }
});

var commandInputBinding = new Shiny.InputBinding();
$.extend(commandInputBinding, {
  nextId: 0,
  history: [],
  historyPos: null,
  find: function(scope) {
    return $(scope).find('.reactnb-command');
  },
  getValue: function(el) {
    return $.extend(true, this.parseInput(el), {
      id: 'cmd' + this.nextId++
    });
  },
  parseInput: function(el) {
    var val = $(el).val();
    // Commands with a leading * are plot commands
    var m = /^\[(\w+)\](.*)$/.exec(val);
    if (m) {
      if (!/^(plot|table|html|ui|print|text)$/.test(m[1])) {
        alert('Unknown command type: ' + m[1]);
        throw new Error('Unknown command type');
      }
      return {type: m[1], text: m[2]};
    } else if (/\b(plot|hist|lattice|ggplot|qplot)\b/.test(val) && !/\blibrary\b/.test(val)) {
      return {type: 'plot', text: val}
    } else {
      return {type: 'print', text: val};
    }
  },
  subscribe: function(el, callback) {
    var self = this;
    $el = $(el);
    $el.keydown(function(e) {
      if (e.which == 38) { // up-arrow
        if (self.historyPos > 0) {
          self.historyPos--;
          $el.val(self.history[self.historyPos]);
          $el.select();
          setTimeout(function() {
            el.setSelectionRange($el.val().length, $el.val().length);
          }, 0);
        }
      }
      if (e.which == 40) { // down-arrow
        if (self.historyPos < self.history.length) {
          self.historyPos++;
          if (self.historyPos == self.history.length)
            $el.val('');
          else
            $el.val(self.history[self.historyPos]);
          $el.select();
          setTimeout(function() {
            el.setSelectionRange($el.val().length, $el.val().length);
          }, 0);
        }
      }
      if (e.keyCode == 13) {

        self.history.push($el.val());
        self.historyPos = self.history.length;
        var parsed = self.parseInput(el);
        
        var cmdContainer = $('<div id="cmd' + self.nextId + '" class="past_command">');
        var inputDiv = $('<div class="input">');
        inputDiv.text($el.val());
        var outputClass = 'highlight-text-output';
        if (parsed.type === 'plot') {
          outputClass = 'shiny-plot-output';
        } else if (parsed.type === 'table') {
          outputClass = 'shiny-html-output';
        } else if (parsed.type === 'text') {
          outputClass = 'highlight-text-output';
        } else if (parsed.type === 'html' || parsed.type === 'ui') {
          outputClass = 'shiny-html-output';
        }
        var outputDiv = $('<div id="cmd' + self.nextId + '_output" class="output ' + outputClass + '">');
        cmdContainer.append(inputDiv);
        cmdContainer.append(outputDiv);
        $('#output').append(cmdContainer);
        cmdContainer.draggable();
        Shiny.bindAll(cmdContainer);

        callback();
        $el.val('');
      }
    })
  }
});
Shiny.inputBindings.register(commandInputBinding, 'reactnb-command');

var highlightTextOutputBinding = new Shiny.OutputBinding();
$.extend(highlightTextOutputBinding, {
  find: function(scope) {
    return $(scope).find('.highlight-text-output');
  },
  renderValue: function(el, data) {
    $(el).text(data);
    $(el).addClass('highlight').removeClass('highlight', 800, 'easeInExpo');
  }
});
Shiny.outputBindings.register(highlightTextOutputBinding, 'reactnb-highlightTextOutput');


// Trash functionality

var trash = [];
$(function() {
  $('#trash').droppable({
    tolerance: 'pointer',
    drop: function(e, ui) {
      trash.push(ui.draggable);
      ui.draggable.hide('drop');
      $(this).addClass('full');
    }
  });
  $('#trash').click(function(e) {
    if (trash.length > 0) {
      trash.pop().show('drop');
      if (trash.length == 0) {
        $(this).removeClass('full');
      }
    }
  });
  $('#command').select();
});
