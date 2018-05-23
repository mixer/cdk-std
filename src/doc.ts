/**
 * Contains the configuration of your project, in addition to any decorated
 * controls and scenes we detected. Most top-level parameters are sourced
 * from your package.json upon compilation.
 *
 * @typedef {object} IPackageConfig
 * @property {string} name
 * @property {string} version
 * @property {string} [description]
 * @property {string[]} [keywords]
 * @property {boolean} [private]
 * @property {string} [homepage]
 */

/**
 * IVideoPositionOptions are passed into display.moveVideo() to change
 * where the video is shown on the screen.
 *
 * @typedef {object} IVideoPositionOptions
 * @property {number} [left='auto'] Position of the video on screen from the
 * left-hand edge of the container.
 * @property {number} [right='auto'] Position of the video on screen from the
 * right-hand edge of the container.
 * @property {number} [top='auto'] Position of the video on screen from the
 * top of the container.
 * @property {number} [bottom='auto'] Position of the video on screen from the
 * bottom of the container.
 * @property {number} [width='auto'] Width of the video on screen in pixels.
 * @property {number} [width='auto'] Height of the video on screen in pixels.
 * @property {number} [duration=0] Duration of the movement easing
 * in milliseconds.
 * @property {number} [easing='linear'] CSS easing function. Defaults to 'linear'.
 * See {@link https://developer.mozilla.org/en-US/docs/Web/CSS/transition-timing-function}.
 */

/**
 * ISettings are settings specific to each run of the custom controls. They contain
 * some data about where the controls are displayed and the client displaying them.
 *
 * @typedef {object} ISettings
 * @property {string} language The user's current language setting, as defined
 * in {@link http://www.ietf.org/rfc/bcp/bcp47.txt}: This is generally in the
 * form `<language>[-<locale>]`. For example, `en`, or `en-US`.
 * @property {boolean} placesVideo Whether the video is included in and placed
 * by the control area. On mobile layouts, this will generally be false.
 * @property {'mobile'|'xbox'|'desktop'} platform  The platform the controls
 * are currently running on.
 */

/**
 * IVideoPosition contains data about the position of the video relative
 * to the iframe, in addition to its channel ID.
 *
 * @typedef {object} IVideoPosition
 * @property {number} channelId The channel this video belongs to.
 * @property {number | string} bottom The video's offset from the bottom of
 * the container in pixels or a css position.
 * @property {number | string} top The video's offset from the top of
 * the container in pixels or a css position.
 * @property {number | string} left The video's offset from the left edge of
 * the container in pixels or a css position.
 * @property {number | string} right The video's offset from the right edge of
 * the container in pixels or a css position.
 * @property {number | string} height The video's height in pixels
 * or a css position.
 * @property {number | string} width The video's width in pixels
 * or a css position.
 */

/**
 * IVideoPositionList is given in the `positions()`
 * observable from the {@link Display}.
 *
 * @typedef {object} IVideoPositionList
 * @property {IVideoPosition} connectedPlayer connectedPlayer is the position
 * of the video which the interactive integration is currently connected to.
 * (In a Mixer costream, there can be multiple players displayed at once.)
 * @property {IVideoPosition[]} costreamPlayers costreamPlayers is a list of
 * all players in a Mixer costream. Costreaming allows multiple people to
 * stream together, you can read more about it at the link below. This wil
 * always contain, at minimumum, the connectedPlayer. Additional channels may
 * come and go over the course of the broadcast.
 *
 * See {@link https://watchbeam.zendesk.com/hc/en-us/articles/115003032426-Co-Stream-FAQ}
 * for more information about costreams.
 */

/**
 * IStateDump is a dump of the raw object tree. The Mixer.socket has an
 * `onStateDump` handler which should be attached to; the editor will use
 * this during runtime for debugging.
 *
 * @typedef {object} IStateDump
 * @property {IScene[]} scenes
 * @property {IGroup[]} groups
 * @property {IParticipant} participant
 */

/**
 * ISceneOptions can be passed into the @{@link Scene} decorator.
 *
 * @typedef {object} ISceneOptions
 * @property {boolean} [default=true]
 * Whether to use this scene as the handler for all scenes.
 *
 * You can override scenes by their `id` to use a different scene for a
 * certain sceneID. In cases where there isn't a specific class for a
 * sceneID, the default will be used.
 *
 * ```
 * @Scene({ default: true })
 * class MyAwesomeScene {
 *   // ...
 * }
 * ```
 * @property {string} [id]
 * When specified, registers this class to handle a specific scene ID.
 * For instance, if you wanted the scene IOD `lobby` and `arena` to be
 * implemented with two different classes, you could do that with
 * something like the following:
 *
 * ```
 * @Scene({ id: 'lobby' })
 * class Lobbby {
 *   // ...
 * }
 *
 * @Scene({ id: 'arena' })
 * class Arena {
 *   // ...
 * }
 * ```
 * @property {IInputDescriptor[]} [inputs]
 * Scene inputs. Note: this will be filled in automatically for you
 * if you use the @{@link Input decorator, but this may come in handy if you
 * don't want to or can't use them in your environment.
 */

/**
 * IInputOptions are passed into the @{@link Input} decorator.
 *
 * @typedef {object} IInputOptions
 * @property {string} [alias]
 * Alias of the property as sent to the Interactive game client and sent
 * on the wire. Defaults to the property's name.
 * @property {string} [displayName]
 * Human-readable name of the input as displayed on the interactive
 * editor. Defaults to the property's name.
 * @property {*} [defaultValue] Default value for the option.
 * @property {InputKind} [kind]
 * The type of data this input takes. See the InputKind enum for more
 * information and a description. If you are not using TypeScript, this
 * MUST be defined!
 */

/**
 * ISceneDescriptor is returned from the {@link Registry}'s `.getScene()`.
 * This contains the scene options along with its constructor.
 *
 * @typedef {ISceneOptions} ISceneDescriptor
 * @property {Function} ctor The scene's constructor
 */

/**
 * IInputDescriptors are returned from the {@link Registry}'s .getInputs().
 * This contains the inputs options along with its constructor.
 *
 * @typedef {IInputOptions} IInputDescriptor
 * @property {string} propertyName The name of the property the input decorates
 */

/**
 * IControlOptions are passed to the @{@link Control} decorator to describe how
 * the control is rendered.
 *
 * @typedef {object} IControlOptions
 * @property {string} kind The kind of the control that this class should
 * render. The some default kinds are "button" and "joystick".
 * @property {IInputDescriptor[]} [inputs]
 * Control inputs. Note: this will be filled in automatically for you
 * if you use the @Input decorator, but this may come in handy if you
 * don't want to or can't use them in your environment.
 */

/**
 * IControlDescriptor is returned from the {@link Registry}'s
 * .getControl(). This contains the {@link Control} options along
 * with its constructor.
 *
 * @typedef {IControlOptions} IControlDescriptor
 * @property {Function} ctor The control's constructor
 */

/**
 * An RxJS observable. See {@link http://reactivex.io/rxjs/manual/overview.html#introduction}.
 * @typedef {object} Observable
 */

// hack: some export is needed for esdoc to see this as a module
export const foo = 'bar';
