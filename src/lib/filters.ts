import type { UrbanaResidentialData } from './data'

export type Filter<T> = (item: T) => boolean

function getByPath(obj: any, path: string): any {
	return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj)
}

export type Comparator =
	| 'eq'
	| 'ne'
	| 'gt'
	| 'gte'
	| 'lt'
	| 'lte'
	| 'between'
	| 'in'
	| 'contains'
	| 'startsWith'
	| 'endsWith'
	| 'regex'

function isNumeric(v: any): boolean {
	return typeof v === 'number' || (!Number.isNaN(Number(v)) && v !== null && v !== '')
}

export function filterByPath(
	path: string,
	comparator: Comparator,
	value: any
): Filter<UrbanaResidentialData> {
	return (item) => {
		const v = getByPath(item, path)

		switch (comparator) {
			case 'eq':
				return v === value
			case 'ne':
				return v !== value
			case 'gt':
				return isNumeric(v) && isNumeric(value) ? Number(v) > Number(value) : false
			case 'gte':
				return isNumeric(v) && isNumeric(value) ? Number(v) >= Number(value) : false
			case 'lt':
				return isNumeric(v) && isNumeric(value) ? Number(v) < Number(value) : false
			case 'lte':
				return isNumeric(v) && isNumeric(value) ? Number(v) <= Number(value) : false
			case 'between':
				if (!Array.isArray(value) || value.length < 2) return false
				return isNumeric(v) && isNumeric(value[0]) && isNumeric(value[1])
					? Number(v) >= Number(value[0]) && Number(v) <= Number(value[1])
					: false
			case 'in':
				return Array.isArray(value) ? value.includes(v) : false
			case 'contains':
				return typeof v === 'string' && String(v).toLowerCase().includes(String(value).toLowerCase())
			case 'startsWith':
				return typeof v === 'string' && String(v).startsWith(String(value))
			case 'endsWith':
				return typeof v === 'string' && String(v).endsWith(String(value))
			case 'regex':
				try {
					const re = value instanceof RegExp ? value : new RegExp(String(value))
					return typeof v === 'string' ? re.test(v) : false
				} catch {
					return false
				}
			default:
				return false
		}
	}
}

export function and<T>(...filters: Filter<T>[]): Filter<T> {
	return (item) => filters.every((f) => f(item))
}

export function or<T>(...filters: Filter<T>[]): Filter<T> {
	return (item) => filters.some((f) => f(item))
}

export function not<T>(filter: Filter<T>): Filter<T> {
	return (item) => !filter(item)
}

export function applyFilters(data: UrbanaResidentialData[], filter?: Filter<UrbanaResidentialData>) {
	if (!filter) return data
	return data.filter(filter)
}

// Short helpers for common fields
export const yearEq = (year: number) => filterByPath('year', 'eq', year)
export const ccaaContains = (s: string) => filterByPath('ccaa', 'contains', s)
export const provinceEq = (p: string) => filterByPath('province', 'eq', p)
export const cityContains = (c: string) => filterByPath('city', 'contains', c)
export const codeEq = (c: number) => filterByPath('code', 'eq', c)

// Example paths for nested fields:
// 'owners.onlyOne.fisNA' or 'propiedades.twoToFive.sociedades'

export default {
	getByPath,
	filterByPath,
	and,
	or,
	not,
	applyFilters
}

