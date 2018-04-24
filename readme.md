#  cdk-std

The `cdk-std` is the standard library for development with Mixer Interactive controls. It provides foundational functionality to communicate from your controls to the Mixer webpage. If you're using the Preact starter, this library is already largely wrapped up for you. If you're using the HTML starter code, you'll be dealing with this more directly.

### Usage & Documentation

API documentation is available [here](https://mixer.github.io/cdk-std/simple-ref.html).

We recommend importing this script through our CDN by adding a script tag in the `<head>` of your webpage:

```html
<script  src="https://mixercc.azureedge.net/lib/std-v0.2.js"></script>
```

After importing it, `mixer` will be available as a global variable in your code. To send input, for example, you can call:

```js
document.getElementById('hello-world').onclick = function(event) {
  mixer.socket.call('giveInput', {
    controlID: 'hello-world',
    event: 'click',
    button: event.button,
  });
};
```

For more information, head to our [developer site](https://dev.mixer.com/)!

### Why is this needed?

For security reasons, all custom control code you write runs in a sandboxes iframe in the Mixer page. However, there's information we want to tell you about, such as the data coming down the Interactive websocket, the position of the video, and so on and so forth. This package provides a bridge and pleasant wrappers over postMessage, the protocol that allows that to happen.

```
                   │
┌──────────────┐       ┌──────────────┐
│Mixer webpage │   │   │ Your Custom  │
│    or app    │       │   Controls   │
│           ┌──┴───┴───┴──┐           │
│         ◀─┤   cdk-std   ├─▶         │
│           └──┬───┬───┬──┘           │
└──────────────┘       └──────────────┘
                   │

            Frame boundary

```
