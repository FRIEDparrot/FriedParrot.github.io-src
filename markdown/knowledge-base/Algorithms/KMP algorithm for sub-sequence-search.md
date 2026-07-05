---
tags:
  - algorithms/KMP
  - sequence-search
---
### 1. Introduction & Background Information  

In the development of [Equation Citator](https://github.com/FRIEDparrot/obsidian-equation-citator), the citation can't be correctly rendered in an embedded link preview before v1.2.3. This is because, in the `markdownPostProcessor`, we can only access `full text`, and `line range of a specific text`, but can't access the text of a specific line. So the`line number` and `the number of citations in a line` is needed to ensure that it is correctly rendered. Then we fill them correspondingly. 

However, the return value of the `full text` when it's a section view(or embedded link preview), the full text is the text of a section rather than the whole article (For example, line 100-200), and the line ranges is also the relative range beginning from this section. So **if we render according to the line number in article rather than in the section**, there would be serious mismatch. 

In such case, to **ensure the returned section text is exactly part of this article**, a <b><mark style='background: transparent; color: red'>line hash + KMP algorithm</mark></b> is applied to **match the lines of the section**, then the citations are filtered by the actual line range to make the citation information match one by one.

This fix is described in 1.2.4 : Fix [bug #31](https://github.com/FRIEDparrot/obsidian-equation-citator/issues/31), now citations can rendered correctly in embedded link preview. 

### 2. KMP algorithm
In the case that we want to find a sequence `target` from `pattern`.   

When comparing a pattern : 
![[Algorithms/assets/Pasted image 20260629090315.png|402]]

1. firstly, compare all the pattern sequence 
2. move the location of longest prefix the start of longest suffix 
3. <b><mark style='background: transparent; color: orange'>re-compare from longest prefix location</mark></b>

for each character, we can record the 

| Array | A   | B   | C   | D   | A   | B   | C   |
| ----- | --- | --- | --- | --- | --- | --- | --- |
| next  | -1  | 0   | 0   | 0   | 1   | 2   | 3   |
so when comparing failed at character $i$, then we should move the re-compare location to `next[i-1]` 
### 3. Code implementation
Firstly, we **pre-compute the `next` array by following function** : 

```typescript
/**
 * Build the failure function (next array) for KMP algorithm 
 * next[i] represents the length of the longest proper prefix of pattern[0...i] 
 * @param pattern 
 * @returns 
 */
export function buildNext<T>(pattern: T[]): number[] {
    const next = new Array(pattern.length).fill(0);
    // use j to = calculate the next[i]
    let j = 0;
    for (let i = 1; i < pattern.length; i++) {
        while (j > 0 && pattern[i] !== pattern[j]) {
            j = next[j - 1];  // fall back to  correct position
        }
        if (pattern[i] === pattern[j]) {
            j++;  // update j to the next position
        }
        next[i] = j;
    }
    return next;
}
```

After that, we implement the `find_array` function using KMP algorithm : 
```typescript
/**
 * Find the location of pattern in target using KMP algorithm 
 * @param pattern    the pattern to find
 * @param target     the target to search in 
 * @returns  the index of the first occurrence of pattern in target, 
 *           if pattern is not found, return -1  
 */
export function find_array<T>(pattern: T[], target: T[]) {
    const targetLength = target.length;
    const patternLength = pattern.length;
    if (patternLength === 0) {
        return 0;
    }
    else if (patternLength > targetLength) {
        return -1;
    }
    const next = buildNext(pattern); 
    for (let i = 0, j = 0; i < targetLength; i++) {
        while (j > 0 && target[i] !== pattern[j]) {
            j = next[j - 1];
        }
        if (target[i] === pattern[j]) {
            j++;
        }
        if (j === patternLength) {
            return i - patternLength + 1;
        }
    }
    return -1;
}
```

The returned `index` is the location of the `pattern` in `target`, or `-1` if not found. This efficient approach allows the algorithm to skip redundant comparisons by leveraging pre-calculated prefix information. In summary, the KMP algorithm provides a fast and reliable way to handle sequence matching. By using this method to map line hashes, we ensure that citations in the Equation Citator are always rendered correctly, even when working with the relative line ranges of embedded previews.
