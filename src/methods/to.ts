import { reduce } from "./reduce";
import { PureStream } from "../PureStream";

/**
 * Convert a stream into a promise for an array of values.
 * This consumes the stream.
 */
export function toPromise<In, Out>(stream: PureStream<In, Out>) {
  return new Promise<Out[]>((resolve, reject) => {
    stream.pipe(reduce<Out, Out[]>(async (prev, next) => {
      prev.push(next);
      return prev;
    }, []))
      .each(resolve)
      .done((err) => {
        if (err) reject(err);
      })
  });
}
