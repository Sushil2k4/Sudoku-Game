var Sudoku = (function ($) {
    var _instance, _game;

    var defaultConfig = {
        validate_on_insert: true,
        show_solver_timer: true,
        show_recursion_counter: true,
        solver_shuffle_number: true
    };

    function init(config) {
        var conf = $.extend({}, defaultConfig, config);
        _game = new Game(conf);

        return {
            getGameBoard: function () {
                return _game.buildGUI();
            },
            reset: function () {
                _game.resetGame();
            },
            validate: function () {
                var isValid = _game.validateMatrix();
                $('.sudoku-container').toggleClass('valid-matrix', isValid);
            },
            solve: function () {
                if (!_game.validateMatrix()) {
                    return false;
                }
                _game.recursionCounter = 0;
                _game.backtrackCounter = 0;

                var starttime = Date.now();
                var isValid = _game.solveGame(0, 0);
                var endtime = Date.now();

                $('.sudoku-container').toggleClass('valid-matrix', isValid);
                if (isValid) {
                    $('.valid-matrix input').attr('disabled', 'disabled');
                }

                if (_game.config.show_solver_timer) {
                    console.log('Solver elapsed time: ' + (endtime - starttime) + 'ms');
                }
                if (_game.config.show_recursion_counter) {
                    console.log('Solver recursions: ' + _game.recursionCounter);
                    console.log('Solver backtracks: ' + _game.backtrackCounter);
                }
            }
        };
    }

    function Game(config) {
        this.config = config;
        this.recursionCounter = 0;
        this.backtrackCounter = 0;
        this.$cellMatrix = {};
        this.matrix = {};
        this.validation = {};
        this.resetValidationMatrices();
    }

    Game.prototype = {
        buildGUI: function () {
            var $table = $('<table>').addClass('sudoku-container');
            for (var i = 0; i < 9; i++) {
                var $tr = $('<tr>');
                this.$cellMatrix[i] = {};
                for (var j = 0; j < 9; j++) {
                    var $input = $('<input>').attr('maxlength', 1)
                        .data('row', i)
                        .data('col', j)
                        .on('keyup', $.proxy(this.onKeyUp, this));
                    this.$cellMatrix[i][j] = $input;
                    var $td = $('<td>').append($input);
                    var sectIdi = Math.floor(i / 3);
                    var sectIdj = Math.floor(j / 3);
                    $td.addClass((sectIdi + sectIdj) % 2 === 0 ? 'sudoku-section-one' : 'sudoku-section-two');
                    $tr.append($td);
                }
                $table.append($tr);
            }
            return $table;
        },

        onKeyUp: function (e) {
            var val = $.trim($(e.currentTarget).val());
            var row = $(e.currentTarget).data('row');
            var col = $(e.currentTarget).data('col');
            var sectRow = Math.floor(row / 3);
            var sectCol = Math.floor(col / 3);
            var sectIndex = (row % 3) * 3 + (col % 3);

            $('.sudoku-container').removeClass('valid-matrix');
            if (this.config.validate_on_insert) {
                var isValid = this.validateNumber(val, row, col, this.matrix.row[row][col]);
                $(e.currentTarget).toggleClass('sudoku-input-error', !isValid);
            }

            this.matrix.row[row][col] = val;
            this.matrix.col[col][row] = val;
            this.matrix.sect[sectRow][sectCol][sectIndex] = val;
        },

        resetGame: function () {
            this.resetValidationMatrices();
            for (var row = 0; row < 9; row++) {
                for (var col = 0; col < 9; col++) {
                    this.$cellMatrix[row][col].val('');
                }
            }
            $('.sudoku-container input').removeAttr('disabled');
            $('.sudoku-container').removeClass('valid-matrix');
        },

        resetValidationMatrices: function () {
            this.matrix = { row: {}, col: {}, sect: {} };
            this.validation = { row: {}, col: {}, sect: {} };

            for (var i = 0; i < 9; i++) {
                this.matrix.row[i] = Array(9).fill('');
                this.matrix.col[i] = Array(9).fill('');
                this.validation.row[i] = [];
                this.validation.col[i] = [];
            }

            for (var row = 0; row < 3; row++) {
                this.matrix.sect[row] = [];
                this.validation.sect[row] = {};
                for (var col = 0; col < 3; col++) {
                    this.matrix.sect[row][col] = Array(9).fill('');
                    this.validation.sect[row][col] = [];
                }
            }
        },

        validateNumber: function (num, rowId, colId, oldNum = '') {
            var isValid = true;
            var sectRow = Math.floor(rowId / 3);
            var sectCol = Math.floor(colId / 3);

            const removeFromValidation = (arr, val) => {
                const index = arr.indexOf(val);
                if (index !== -1) arr.splice(index, 1);
            };

            removeFromValidation(this.validation.row[rowId], oldNum);
            removeFromValidation(this.validation.col[colId], oldNum);
            removeFromValidation(this.validation.sect[sectRow][sectCol], oldNum);

            if (num !== '' && $.isNumeric(num) && Number(num) >= 1 && Number(num) <= 9) {
                if (
                    this.validation.row[rowId].includes(num) ||
                    this.validation.col[colId].includes(num) ||
                    this.validation.sect[sectRow][sectCol].includes(num)
                ) {
                    isValid = false;
                }
                this.validation.row[rowId].push(num);
                this.validation.col[colId].push(num);
                this.validation.sect[sectRow][sectCol].push(num);
            }
            return isValid;
        },

        validateMatrix: function () {
            var hasError = false;
            for (var row = 0; row < 9; row++) {
                for (var col = 0; col < 9; col++) {
                    var val = this.matrix.row[row][col];
                    var isValid = this.validateNumber(val, row, col, val);
                    this.$cellMatrix[row][col].toggleClass('sudoku-input-error', !isValid);
                    if (!isValid) hasError = true;
                }
            }
            return !hasError;
        },

        solveGame: function (row, col) {
            this.recursionCounter++;
            var $nextSquare = this.findClosestEmptySquare(row, col);
            if (!$nextSquare) return true;

            var sqRow = $nextSquare.data('row');
            var sqCol = $nextSquare.data('col');
            var legalValues = this.findLegalValuesForSquare(sqRow, sqCol);
            var sectRow = Math.floor(sqRow / 3);
            var sectCol = Math.floor(sqCol / 3);
            var sectIndex = (sqRow % 3) * 3 + (sqCol % 3);

            for (var i = 0; i < legalValues.length; i++) {
                var cval = legalValues[i];
                $nextSquare.val(cval);
                this.matrix.row[sqRow][sqCol] = cval;
                this.matrix.col[sqCol][sqRow] = cval;
                this.matrix.sect[sectRow][sectCol][sectIndex] = cval;

                if (this.solveGame(sqRow, sqCol)) return true;

                this.backtrackCounter++;
                $nextSquare.val('');
                this.matrix.row[sqRow][sqCol] = '';
                this.matrix.col[sqCol][sqRow] = '';
                this.matrix.sect[sectRow][sectCol][sectIndex] = '';
            }
            return false;
        },

        findClosestEmptySquare: function (row, col) {
            for (var i = col + 9 * row; i < 81; i++) {
                var walkingRow = Math.floor(i / 9);
                var walkingCol = i % 9;
                if (this.matrix.row[walkingRow][walkingCol] === '') {
                    return this.$cellMatrix[walkingRow][walkingCol];
                }
            }
            return null;
        },

        findLegalValuesForSquare: function (row, col) {
            var legalNums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            var sectRow = Math.floor(row / 3);
            var sectCol = Math.floor(col / 3);

            for (let i = 0; i < 9; i++) {
                [this.matrix.col[col][i], this.matrix.row[row][i], this.matrix.sect[sectRow][sectCol][i]].forEach(val => {
                    val = Number(val);
                    if (val && legalNums.includes(val)) {
                        legalNums.splice(legalNums.indexOf(val), 1);
                    }
                });
            }

            if (this.config.solver_shuffle_number) {
                for (let i = legalNums.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    [legalNums[i], legalNums[j]] = [legalNums[j], legalNums[i]];
                }
            }
            return legalNums;
        }
    };

    return {
        getInstance: function (config) {
            if (!_instance) _instance = init(config);
            return _instance;
        }
    };
})(jQuery);

$(document).ready(function () {
    var game = Sudoku.getInstance();
    $('#container').append(game.getGameBoard());
    $('#solve').click(function () {
        game.solve();
    });
    $('#validate').click(function () {
        game.validate();
    });
    $('#reset').click(function () {
        game.reset();
    });
});
