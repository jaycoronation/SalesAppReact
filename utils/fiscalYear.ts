
export const MONTH_NAMES: Record<number, string> = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December',
}

export const MONTH_SHORT: Record<number, string> = {
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
    5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug',
    9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec',
}

export function getFiscalYear(month: number, year: number): string {
    if (month >= 4) return `${year}-${String(year + 1).slice(-2)}`
    return `${year - 1}-${String(year).slice(-2)}`
}

export function getCurrentFY(): string {
    const d = new Date()
    const m = d.getMonth() + 1
    const y = d.getFullYear()
    return getFiscalYear(m, y)
}

export function getFinancialYears(): string[] {
    const currentFY = getCurrentFY()
    const startYear = parseInt(currentFY.split('-')[0])
    const years: string[] = []
    for (let i = 0; i < 4; i++) {
        const y = startYear - i
        years.push(`${y}-${String(y + 1).slice(-2)}`)
    }
    return years
}

export function getMonthsForFY(fy: string): { month: number, year: number, label: string }[] {
    const startYear = parseInt(fy.split('-')[0])
    const months: { month: number, year: number, label: string }[] = []

    // Apr to Dec of startYear
    for (let m = 4; m <= 12; m++) {
        months.push({ month: m, year: startYear, label: MONTH_SHORT[m] })
    }
    // Jan to Mar of startYear + 1
    for (let m = 1; m <= 3; m++) {
        months.push({ month: m, year: startYear + 1, label: MONTH_SHORT[m] })
    }
    return months
}
