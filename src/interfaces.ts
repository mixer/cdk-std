export interface IScene {
  sceneID: string;
  controls: IControl[] | null;
}

export interface IControl {
  controlID: string;
  kind: string;
  cost: number;
}

export interface IGroup {
  groupID: string;
  sceneID: string;
}

/**
 * Represents raw data received from the interactive server.
 */
export interface IIncomingPacket {
  type: string;
  method: string;
  params: any;
}
