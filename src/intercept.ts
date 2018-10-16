export type InterceptorFn = (params: any) => Promise<boolean>;

/**
 * Interceptor Manager allows for the storage of method names to interceptor functions.
 *
 * It is used to gate a method from being transmitted to the Interactive server.
 *
 * @example interceptor.intercept(params => if(params.potato) { return Promise.resolve(false); })
 */
export class InterceptorManager {
  public methods: Map<string, InterceptorFn> = new Map<string, InterceptorFn>();

  public add(method: string, interceptor: InterceptorFn) {
    this.methods.set(method, interceptor);
  }
  public has(method: string) {
    return this.methods.has(method);
  }

  public run(method: string, params: any): Promise<boolean> {
    if (this.has(method)) {
      return this.methods.get(method)!(params);
    }
    return Promise.resolve(true);
  }
}
