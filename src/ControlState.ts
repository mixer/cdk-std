import { EventEmitter } from 'eventemitter3';
import { IGroup, IIncomingPacket, IScene } from './interfaces';

/**
 * Internally retains data required to acquire a control's kind.
 * @private
 */
export class ControlsState extends EventEmitter {
  private scenes: {
    [sceneID: string]: { [controlID: string]: { kind: string; cost: number } };
  } = {};
  private groups: { [groupID: string]: string } = {};
  private currentGroup = 'default';

  /**
   * Handles a packet sent from the client.
   */
  public handleIncomingPacket({ type, method, params }: IIncomingPacket) {
    if (type !== 'method') {
      return;
    }

    if (method === 'onControlCreate' || method === 'onControlUpdate') {
      this.cacheScene(params, true);
    }

    if (method === 'onSceneCreate') {
      params.scenes.forEach((scene: IScene) => {
        this.cacheScene(scene);
      });
    }

    if (method === 'onSceneDelete') {
      delete this.scenes[params.sceneID];
    }

    if (method === 'onGroupCreate' || method === 'onGroupUpdate') {
      params.groups.forEach((group: IGroup) => {
        this.cacheGroup(group);
      });
    }

    if (method === 'onGroupDelete') {
      delete this.groups[params.groupID];
    }

    if (method === 'onParticipantJoin' || method === 'onParticipantUpdate') {
      this.currentGroup = params.participants[0].groupID;
    }
  }

  /**
   * Gets a control's kind by its control ID.
   */
  public getControlKind(controlID: string) {
    return this.scenes[this.groups[this.currentGroup]][controlID].kind;
  }

  public getControlCost(controlID: string) {
    return this.scenes[this.groups[this.currentGroup]][controlID].cost;
  }

  /**
   * Caches the control kind for a scene.
   */
  private cacheScene(scene: IScene, isPartial = false) {
    if (!this.scenes[scene.sceneID] || !isPartial) {
      this.scenes[scene.sceneID] = {};
    }

    if (!scene.controls) {
      return;
    }

    scene.controls.forEach(control => {
      this.scenes[scene.sceneID][control.controlID] = {
        kind: control.kind,
        cost: control.cost,
      };
    });
  }

  /**
   * Caches a group.
   */
  private cacheGroup(group: IGroup) {
    this.groups[group.groupID] = group.sceneID;
  }
}
