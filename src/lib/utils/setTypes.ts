import { convertCamelCaseToNormal } from '$lib/utils';
import type { SetType } from './prismaEnums';

/** How a set type reads, e.g. "Myorep match"; V2 (each set on its own) reads "Independent" */
export function setTypeLabel(setType: SetType | string | undefined): string {
	if (setType === undefined) return '';
	return setType === 'V2' ? 'Independent' : convertCamelCaseToNormal(setType);
}
