import { readFileSync } from 'fs'
// Contenido del CSV embebido por Vite (?raw): funciona en dev y en build.
import csvContent from '../assets/2025.csv?raw'

// Tipos de Personas Fiscales basados en primera letra del NIF
export enum PersonaFiscalType {
    FIS_NA = "FIS_NA",           // Física Nacional
    FIS_EX = "FIS_EX",           // Física Extranjera
    SOCIEDADES = "SOCIEDADES",   // Sociedades
    ENTIDADES_SINAL = "ENTIDADES_SINAL",     // Entidades sin Personalidad Jurídica - Nacional
    ENTIDADES_SINPJ = "ENTIDADES_SINPJ",     // Entidades sin Personalidad Jurídica
    ENTIDADES_EXT = "ENTIDADES_EXT",         // Entidades Extranjeras
    AAPP = "AAPP",               // Administración Pública
    ENTIDADES_NDEF = "ENTIDADES_NDEF",       // Entidades No Definidas
    OTROS = "OTROS"              // Otros
}

// Datos de Urbana por Tipo de Persona Fiscal
export interface OwnerData {
    onlyOne: PersonaFiscalData,
    twoToFive: PersonaFiscalData,
    sixToTen: PersonaFiscalData,
    elevenToTwentyFive: PersonaFiscalData,
    twentySixToHundred: PersonaFiscalData,
    moreThan100: PersonaFiscalData
}
export interface UrbanaResidentialData {
    year: number
    ccaa: string
    province: string
    city: string
    code: number
    // Datos de Titulares (T)
    totalOwners:number
    totalProperties:number

    owners: OwnerData
    propiedades: OwnerData
}


export interface PersonaFiscalData {
    fisNA: number                // Física Nacional
    fisEX: number                // Física Extranjera
    sociedades: number           // Sociedades
    entidadesSinal: number       // Entidades sin PJ Nacional
    entidadesSinpj: number       // Entidades sin Personalidad Jurídica
    entidadesExt: number         // Entidades Extranjeras
    aapp: number                 // Administración Pública
    entidadesNdef: number        // Entidades No Definidas
    otros: number                // Otros
}

function parseCsvContent(csvContent: string): UrbanaResidentialData[] {
    const rows: string[] = csvContent.split("\n").filter(r => r.trim())
    const data: UrbanaResidentialData[] = []

    for (let row = 1; row < rows.length; row++) {
        const values = rows[row].split(";")
        const parsed = parseRow(values)
        if (parsed) data.push(parsed)
    }
    return data
}

function parseRow(row: string[]): UrbanaResidentialData | null {
    if (row.length < 115) return null

    try {
        const urban: UrbanaResidentialData = {
            year: parseInt(row[0], 10),
            ccaa: row[1],
            province: row[2],
            code: parseInt(row[3], 10),
            city: row[4],
            totalOwners: parseInt(row[5], 10),
            totalProperties: parseInt(row[6], 10),
            owners: {
                onlyOne: parsePersonaFiscalData(row.slice(8, 17)),
                twoToFive: parsePersonaFiscalData(row.slice(17, 26)),
                sixToTen: parsePersonaFiscalData(row.slice(26, 35)),
                elevenToTwentyFive: parsePersonaFiscalData(row.slice(35, 44)),
                twentySixToHundred: parsePersonaFiscalData(row.slice(44, 53)),
                moreThan100: parsePersonaFiscalData(row.slice(53, 62))
            },
            propiedades: {
                onlyOne: parsePersonaFiscalData(row.slice(62, 71)),
                twoToFive: parsePersonaFiscalData(row.slice(71, 80)),
                sixToTen: parsePersonaFiscalData(row.slice(80, 89)),
                elevenToTwentyFive: parsePersonaFiscalData(row.slice(89, 98)),
                twentySixToHundred: parsePersonaFiscalData(row.slice(98, 107)),
                moreThan100: parsePersonaFiscalData(row.slice(107, 116))
            }
        }
        return urban
    } catch (error) {
        console.error("Error parsing row:", error)
        return null
    }
}

function parsePersonaFiscalData(values: string[]): PersonaFiscalData {
    return {
        fisNA: parseInt(values[0], 10) || 0,
        fisEX: parseInt(values[1], 10) || 0,
        sociedades: parseInt(values[2], 10) || 0,
        entidadesSinal: parseInt(values[3], 10) || 0,
        entidadesSinpj: parseInt(values[4], 10) || 0,
        entidadesExt: parseInt(values[5], 10) || 0,
        aapp: parseInt(values[6], 10) || 0,
        entidadesNdef: parseInt(values[7], 10) || 0,
        otros: parseInt(values[8], 10) || 0
    }
}

// Function to read and parse CSV from file path
export function readCsv(filePath: string): UrbanaResidentialData[] {
    const csvContent = readFileSync(filePath, 'utf-8')
    return parseCsvContent(csvContent)
}

// Load and parse the CSV data (embebido vía import ?raw)
let urbanaData: UrbanaResidentialData[] = []
try {
    urbanaData = parseCsvContent(csvContent)
    console.log('CSV loaded successfully. Total records:', urbanaData.length)
} catch (error) {
    console.error('Error loading CSV:', error)
}

export { urbanaData }
