const socket = io();

function scrollToBottom() {
  // Selectors
  const messages = jQuery('#messages');
  const newMessage = messages.children('li:last-child');
  // Heights
  const clientHeight = messages.prop('clientHeight');
  const scrollTop = messages.prop('scrollTop');
  const scrollHeight = messages.prop('scrollHeight');
  const newMessageHeight = newMessage.innerHeight();
  const lastMessageHeight = newMessage.prev().innerHeight();

  if (clientHeight + scrollTop + newMessageHeight + lastMessageHeight >= scrollHeight) {
    messages.scrollTop(scrollHeight);
  }
}

socket.on('connect', () => {
  const params = jQuery.deparam(window.location.search);

  socket.emit('join', params, (err) => {
    if (err) {
      console.log(err);
      window.location.href = '/';
    } else {
      console.log('No error');
    }
  });
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('updateUserList', (users) => {
  const ol = jQuery('<ol></ol>');

  users.forEach((user) => {
    ol.append(jQuery('<li></li>').text(user));
  });

  jQuery('#users').html(ol);
});

socket.on('newMessage', (message) => {
  const formattedTime = moment(message.createdAt).format('h:mm a');
  const template = jQuery('#message-template').html();
  const html = Mustache.render(template, {
    text: message.text,
    from: message.from,
    createdAt: formattedTime,
  });

  jQuery('#messages').append(html);
  scrollToBottom();
});

socket.on('newLocationMessage', (message) => {
  const formattedTime = moment(message.createdAt).format('h:mm a');
  const template = jQuery('#location-message-template').html();
  const html = Mustache.render(template, {
    from: message.from,
    url: message.url,
    createdAt: formattedTime,
  });

  jQuery('#messages').append(html);
  scrollToBottom();
});

jQuery('#message-form').on('submit', (e) => {
  e.preventDefault();

  const messageTextbox = jQuery('[name=message]');

  socket.emit('createMessage', {
    text: messageTextbox.val(),
  }, () => {
    messageTextbox.val('');
  });
});
