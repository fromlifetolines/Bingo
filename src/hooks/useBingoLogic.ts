import { useCallback } from 'react';

// 4x4 Grid Ranges (1-75 split into 4 columns)
// Col 0: 1-19
// Col 1: 20-38
// Col 2: 39-57
// Col 3: 58-75
const COL_RANGES = {
    0: { min: 1, max: 19 },
    1: { min: 20, max: 38 },
    2: { min: 39, max: 57 },
    3: { min: 58, max: 75 },
};

export const useBingoLogic = () => {

    const generateCard = useCallback(() => {
        const card = new Array(16).fill(0); // 4x4 = 16

        // Generate columns
        for (let col = 0; col < 4; col++) {
            const { min, max } = COL_RANGES[col as keyof typeof COL_RANGES];
            const numbers = new Set<number>();

            while (numbers.size < 4) {
                numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
            }

            const colNums = Array.from(numbers);

            // Fill the grid column-wise
            // Indexes for 4x4:
            // 0, 1, 2, 3
            // 4, 5, 6, 7
            // 8, 9, 10, 11
            // 12, 13, 14, 15
            // Col 0 is indices: 0, 4, 8, 12
            for (let row = 0; row < 4; row++) {
                card[row * 4 + col] = colNums[row];
            }
        }

        // No free space in 4x4 usually, or strictly requested? 
        // User said "16 numbers total", implies full grid.

        return card;
    }, []);

    const checkBingo = useCallback((markedIndices: number[]) => {
        const marked = new Set(markedIndices);

        // Win condition: 3 LINES (Any combination of Row, Col, Diagonal)
        let lineCount = 0;

        // Rows (4 rows)
        for (let i = 0; i < 4; i++) {
            if ([0, 1, 2, 3].every(offset => marked.has(i * 4 + offset))) lineCount++;
        }

        // Cols (4 cols)
        for (let i = 0; i < 4; i++) {
            if ([0, 1, 2, 3].every(offset => marked.has(offset * 4 + i))) lineCount++;
        }

        // Diagonals (2 diagonals)
        if ([0, 5, 10, 15].every(idx => marked.has(idx))) lineCount++; // Top-Left to Bottom-Right
        if ([3, 6, 9, 12].every(idx => marked.has(idx))) lineCount++;  // Top-Right to Bottom-Left

        return lineCount >= 3;
    }, []);

    return { generateCard, checkBingo };
};
