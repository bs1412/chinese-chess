const FILES = 9;
const RANKS = 10;
const MATE_SCORE = 100000;
const PIECE_VALUES = { k: 10000, r: 900, c: 460, h: 420, a: 220, e: 220, p: 100 };

function initialBoard() {
  const board = Array(FILES * RANKS).fill(null);
  const backRank = ['r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r'];
  for (let x = 0; x < FILES; x += 1) {
    board[indexOf(x, 0)] = { s: 'b', t: backRank[x] };
    board[indexOf(x, 9)] = { s: 'r', t: backRank[x] };
  }
  [1, 7].forEach((x) => {
    board[indexOf(x, 2)] = { s: 'b', t: 'c' };
    board[indexOf(x, 7)] = { s: 'r', t: 'c' };
  });
  [0, 2, 4, 6, 8].forEach((x) => {
    board[indexOf(x, 3)] = { s: 'b', t: 'p' };
    board[indexOf(x, 6)] = { s: 'r', t: 'p' };
  });
  return board;
}

function indexOf(x, y) { return y * FILES + x; }
function inBounds(x, y) { return x >= 0 && x < FILES && y >= 0 && y < RANKS; }
function opposite(side) { return side === 'r' ? 'b' : 'r'; }
function cloneBoard(board) {
  return board.map((piece) => (piece ? { s: piece.s, t: piece.t } : null));
}
function palaceContains(side, x, y) {
  return x >= 3 && x <= 5 && (side === 'r' ? y >= 7 && y <= 9 : y >= 0 && y <= 2);
}
function addIfAvailable(board, moves, x, y, side) {
  if (!inBounds(x, y)) return;
  const target = board[indexOf(x, y)];
  if (!target || target.s !== side) moves.push({ x, y });
}

function pseudoMoves(board, x, y) {
  const piece = board[indexOf(x, y)];
  if (!piece) return [];
  const moves = [];
  const side = piece.s;
  if (piece.t === 'k') {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (palaceContains(side, nx, ny)) addIfAvailable(board, moves, nx, ny, side);
    });
    for (let ny = y + (side === 'r' ? -1 : 1); inBounds(x, ny); ny += side === 'r' ? -1 : 1) {
      const target = board[indexOf(x, ny)];
      if (!target) continue;
      if (target.s !== side && target.t === 'k') moves.push({ x, y: ny });
      break;
    }
  } else if (piece.t === 'a') {
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (palaceContains(side, nx, ny)) addIfAvailable(board, moves, nx, ny, side);
    });
  } else if (piece.t === 'e') {
    [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      const staysHome = side === 'r' ? ny >= 5 : ny <= 4;
      if (!inBounds(nx, ny) || !staysHome) return;
      if (board[indexOf(x + dx / 2, y + dy / 2)]) return;
      addIfAvailable(board, moves, nx, ny, side);
    });
  } else if (piece.t === 'h') {
    [
      [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1],
      [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0]
    ].forEach(([dx, dy, legX, legY]) => {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny) && !board[indexOf(x + legX, y + legY)]) {
        addIfAvailable(board, moves, nx, ny, side);
      }
    });
  } else if (piece.t === 'r' || piece.t === 'c') {
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      let screenFound = false;
      for (let nx = x + dx, ny = y + dy; inBounds(nx, ny); nx += dx, ny += dy) {
        const target = board[indexOf(nx, ny)];
        if (piece.t === 'r') {
          if (!target) moves.push({ x: nx, y: ny });
          else {
            if (target.s !== side) moves.push({ x: nx, y: ny });
            break;
          }
        } else if (!screenFound) {
          if (!target) moves.push({ x: nx, y: ny });
          else screenFound = true;
        } else if (target) {
          if (target.s !== side) moves.push({ x: nx, y: ny });
          break;
        }
      }
    });
  } else if (piece.t === 'p') {
    const forward = side === 'r' ? -1 : 1;
    addIfAvailable(board, moves, x, y + forward, side);
    const crossedRiver = side === 'r' ? y <= 4 : y >= 5;
    if (crossedRiver) {
      addIfAvailable(board, moves, x - 1, y, side);
      addIfAvailable(board, moves, x + 1, y, side);
    }
  }
  return moves;
}

function applyMove(board, move) {
  const next = cloneBoard(board);
  const from = indexOf(move.fromX, move.fromY);
  const to = indexOf(move.x, move.y);
  next[to] = next[from];
  next[from] = null;
  return next;
}

function findKing(board, side) {
  return board.findIndex((piece) => piece && piece.s === side && piece.t === 'k');
}

function isInCheck(board, side) {
  const kingAt = findKing(board, side);
  if (kingAt < 0) return true;
  const kingX = kingAt % FILES;
  const kingY = Math.floor(kingAt / FILES);
  const attacker = opposite(side);
  for (let from = 0; from < board.length; from += 1) {
    const piece = board[from];
    if (!piece || piece.s !== attacker) continue;
    const moves = pseudoMoves(board, from % FILES, Math.floor(from / FILES));
    if (moves.some((move) => move.x === kingX && move.y === kingY)) return true;
  }
  return false;
}

function legalMovesForPiece(board, x, y) {
  const piece = board[indexOf(x, y)];
  if (!piece) return [];
  return pseudoMoves(board, x, y)
    .filter((move) => {
      const target = board[indexOf(move.x, move.y)];
      if (target && target.t === 'k') return false;
      const next = applyMove(board, { fromX: x, fromY: y, x: move.x, y: move.y });
      return !isInCheck(next, piece.s);
    })
    .map((move) => ({ fromX: x, fromY: y, x: move.x, y: move.y }));
}

function generateLegalMoves(board, side) {
  const moves = [];
  for (let from = 0; from < board.length; from += 1) {
    const piece = board[from];
    if (piece && piece.s === side) {
      moves.push(...legalMovesForPiece(board, from % FILES, Math.floor(from / FILES)));
    }
  }
  return moves;
}

function evaluate(board, computerSide) {
  let score = 0;
  board.forEach((piece, at) => {
    if (!piece) return;
    const x = at % FILES;
    const y = Math.floor(at / FILES);
    const sign = piece.s === computerSide ? 1 : -1;
    let value = PIECE_VALUES[piece.t];
    if (piece.t === 'p') {
      const advance = piece.s === 'r' ? 9 - y : y;
      value += advance * 9;
      if (piece.s === 'r' ? y <= 4 : y >= 5) value += 45;
      value += (4 - Math.abs(4 - x)) * 3;
    } else if (piece.t === 'h' || piece.t === 'c') {
      value += (4 - Math.abs(4 - x)) * 3;
    }
    score += sign * value;
  });
  if (isInCheck(board, opposite(computerSide))) score += 24;
  if (isInCheck(board, computerSide)) score -= 24;
  return score;
}

function moveOrderScore(board, move) {
  const target = board[indexOf(move.x, move.y)];
  const attacker = board[indexOf(move.fromX, move.fromY)];
  if (!target) return 0;
  return (PIECE_VALUES[target.t] || 0) * 10 - (PIECE_VALUES[attacker.t] || 0);
}

function search(board, sideToMove, depth, alpha, beta, computerSide, ply) {
  const moves = generateLegalMoves(board, sideToMove);
  if (moves.length === 0) {
    const sideLoses = sideToMove === computerSide;
    return sideLoses ? -MATE_SCORE + ply : MATE_SCORE - ply;
  }
  if (depth === 0) return evaluate(board, computerSide);
  moves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));
  const maximizing = sideToMove === computerSide;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const score = search(applyMove(board, move), opposite(sideToMove), depth - 1,
      alpha, beta, computerSide, ply + 1);
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function chooseComputerMove(board, side, depth) {
  const moves = generateLegalMoves(board, side);
  if (moves.length === 0) return null;
  moves.sort((a, b) => moveOrderScore(board, b) - moveOrderScore(board, a));
  let bestMove = moves[0];
  let bestScore = -Infinity;
  let alpha = -Infinity;
  for (const move of moves) {
    const score = search(applyMove(board, move), opposite(side), Math.max(0, depth - 1),
      alpha, Infinity, side, 1);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestScore);
  }
  return bestMove;
}

module.exports = {
  initialBoard, cloneBoard, opposite, isInCheck, legalMovesForPiece,
  generateLegalMoves, applyMove, chooseComputerMove
};
