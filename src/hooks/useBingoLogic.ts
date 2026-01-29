import { useCallback } from 'react';

// Standard 75-ball Bingo columns
// B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
const COL_RANGES = {
    0: { min: 1, max: 15 },  // B
    1: { min: 16, max: 30 }, // I
    2: { min: 31, max: 45 }, // N
    3: { min: 46, max: 60 }, // G
    4: { min: 61, max: 75 }, // O
};

export const useBingoLogic = () => {

    const generateCard = useCallback(() => {
        const card = new Array(25).fill(0);

        // Generate columns
        for (let col = 0; col < 5; col++) {
            const { min, max } = COL_RANGES[col as keyof typeof COL_RANGES];
            const numbers = new Set<number>();

            while (numbers.size < 5) {
                numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
            }

            const colNums = Array.from(numbers); // No need to sort necessarily, but classic bingo often isn't sorted per column, but sometimes is. Let's keep random.

            // Fill the grid column-wise: indices 0, 5, 10, 15, 20 are col 0 (B)
            for (let row = 0; row < 5; row++) {
                card[row * 5 + col] = colNums[row];
            }
        }

        // Free space at center (12 = 2 * 5 + 2) represents N column, 3rd row
        card[12] = 0; // 0 represents FREE SPACE

        return card;
    }, []);

    const checkBingo = useCallback((markedIndices: number[]) => {
        // 0 is also considered marked (free space), so ensure it's in the list or logically handled
        const marked = new Set(markedIndices);
        marked.add(12); // Always mark free space

        // Rows
        for (let i = 0; i < 5; i++) {
            if ([0, 1, 2, 3, 4].every(offset => marked.has(i * 5 + offset))) return true;
        }

        // Cols
        for (let i = 0; i < 5; i++) {
            if ([0, 1, 2, 3, 4].every(offset => marked.has(offset * 5 + i))) return true;
        }

        // Diagonals
        if ([0, 6, 12, 18, 24].every(idx => marked.has(idx))) return true;
        if ([4, 8, 12, 16, 20].every(idx => marked.has(idx))) return true;

        return false;
    }, []);

    return { generateCard, checkBingo };
};
