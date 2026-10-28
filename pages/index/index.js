const chess = require('../../utils/xiangqi');

const RED_LABELS = { k: '帥', a: '仕', e: '相', h: '馬', r: '車', c: '炮', p: '兵' };
const BLACK_LABELS = { k: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒' };

function makeEmptyState() {
  const board = chess.initialBoard();
  return {
    board,
    turn: 'r',
    selected: null,
    legalTargets: [],
    boardCells: [],
    horizontalLines: Array.from({ length: 10 }, (_, index) => index / 9 * 100),
    verticalLines: Array.from({ length: 18 }, (_, index) => ({
      key: 'v' + index,
      left: (index % 9) / 8 * 100,
      top: index < 9 ? 0 : 55.55,
      height: 44.45
    })),
    history: [],
    thinking: false,
    gameOver: false,
    winner: '',
    resultTitle: '',
    resultHint: '',
    statusTitle: '轮到你走棋',
    statusHint: '你执红棋 · 电脑执黑棋'
  };
}

Page({
  data: makeEmptyState(),

  onLoad() {
    this.refreshBoard(chess.initialBoard(), null, []);
  },

  refreshBoard(board, selected, legalTargets) {
    const legalKeys = new Set(legalTargets.map((move) => move.x + ',' + move.y));
    const cells = [];
    for (let y = 0; y < 10; y += 1) {
      for (let x = 0; x < 9; x += 1) {
        const piece = board[y * 9 + x];
        const key = x + ',' + y;
        cells.push({
          key,
          x,
          y,
          left: 5.55 + x / 8 * 88.9,
          top: 5 + y / 9 * 90,
          selected: !!selected && selected.x === x && selected.y === y,
          legal: legalKeys.has(key),
          piece: piece ? {
            s: piece.s,
            t: piece.t,
            label: piece.s === 'r' ? RED_LABELS[piece.t] : BLACK_LABELS[piece.t],
            colorClass: piece.s === 'r' ? 'piece-red' : 'piece-black'
          } : null
        });
      }
    }
    this.setData({ board, selected, legalTargets, boardCells: cells });
  },

  onCellTap(event) {
    const { x, y } = event.currentTarget.dataset;
    const { board, turn, selected, legalTargets, thinking, gameOver } = this.data;
    if (thinking || gameOver || turn !== 'r') return;

    if (selected) {
      const destination = legalTargets.find((move) => move.x === x && move.y === y);
      if (destination) {
        this.commitMove(destination);
        return;
      }
    }

    const piece = board[y * 9 + x];
    if (piece && piece.s === 'r') {
      this.refreshBoard(board, { x, y }, chess.legalMovesForPiece(board, x, y));
      return;
    }
    this.refreshBoard(board, null, []);
  },

  commitMove(move) {
    const { board, turn, history } = this.data;
    const nextBoard = chess.applyMove(board, move);
    const nextTurn = chess.opposite(turn);
    const nextHistory = history.concat([{ board: chess.cloneBoard(board), turn }]);
    this.refreshBoard(nextBoard, null, []);
    this.setData({ turn: nextTurn, history: nextHistory });
    this.checkGameState(nextBoard, nextTurn);
  },

  checkGameState(board, sideToMove) {
    const checked = chess.isInCheck(board, sideToMove);
    const moves = chess.generateLegalMoves(board, sideToMove);
    if (moves.length === 0) {
      const winner = chess.opposite(sideToMove);
      const winnerName = winner === 'r' ? '你' : '电脑';
      this.setData({
        gameOver: true,
        thinking: false,
        winner,
        resultTitle: checked ? winnerName + '赢了' : winnerName + '获胜',
        resultHint: checked ? '绝杀！对方已无合法应对' : '困毙！对方无棋可走',
        statusTitle: checked ? '绝杀判定' : '困毙判定',
        statusHint: '可悔棋，或点击“重新开始”再来一局'
      });
      return;
    }

    if (sideToMove === 'b') {
      this.setData({
        thinking: true,
        statusTitle: checked ? '将军！电脑正在应将' : '电脑思考中',
        statusHint: '请稍候，轮到黑棋走棋'
      });
      setTimeout(() => {
        if (this.data.gameOver || this.data.turn !== 'b') return;
        const move = chess.chooseComputerMove(this.data.board, 'b', 2);
        if (move) this.commitMove(move);
        else this.checkGameState(this.data.board, 'b');
      }, 280);
      return;
    }

    this.setData({
      thinking: false,
      statusTitle: checked ? '电脑将军！轮到你应将' : '轮到你走棋',
      statusHint: checked ? '你的帅正在被攻击' : '你执红棋 · 电脑执黑棋'
    });
  },

  undoMove() {
    const { history, thinking, gameOver } = this.data;
    if (thinking || history.length === 0) return;
    const count = Math.min(history.length, 2);
    const snapshot = history[history.length - count];
    const remaining = history.slice(0, history.length - count);
    this.refreshBoard(chess.cloneBoard(snapshot.board), null, []);
    this.setData({
      turn: snapshot.turn,
      history: remaining,
      gameOver: false,
      winner: '',
      resultTitle: '',
      resultHint: '',
      thinking: false,
      statusTitle: '轮到你走棋',
      statusHint: '你执红棋 · 电脑执黑棋'
    });
    if (snapshot.turn === 'b') this.checkGameState(snapshot.board, 'b');
  },

  restartGame() {
    const initial = makeEmptyState();
    this.setData(initial);
    this.refreshBoard(initial.board, null, []);
  }
});
