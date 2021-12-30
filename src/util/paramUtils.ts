/* eslint-disable valid-jsdoc */
import { URLSearchParams } from 'url';

// from https://stackoverflow.com/a/52539264/13644774
/**
 * Converts a URLSearchParams into a plain object while respecting arrays.
 */
export const groupParamsByKey = (params: URLSearchParams): any =>
  [...params.entries()].reduce((acc, tuple) => {
    // getting the key and value from each tuple
    const [key, val] = tuple;
    if (Object.prototype.hasOwnProperty.call(acc, key)) {
      // if the current key is already an array, we'll add the value to it
      if (Array.isArray(acc[key])) {
        acc[key] = [...acc[key], val];
      } else {
        // if it's not an array, but contains a value, we'll convert it into an array
        // and add the current value to it
        acc[key] = [acc[key], val];
      }
    } else {
      // plain assignment if no special case is present
      acc[key] = val;
    }

    return acc;
  }, {});
