@author Sushil Mishra

var Sudoku = ( function ( $) {
    var _instance, _game,

    @property {Object}

    defaultConfig = {
        'validate_on_insert': true,

        'show_solver_timer': true,

        'show_recursion_counter': true,

        'solver_shuffle_number': true
    },
    paused = false,
    counter = 0;

    @param {Object} config
    @returns {Object}

    function init( config ) {
        conf = $.extend( {}, defaultConfig, config );
        _game = new Game( conf );

        return {
            
            @returns {jQuery}

        getGameBoard: function() {
            return _game.buildGUI();
        },
        reset: function() {
            _game.resetGame();
        },
        @returns {Boolean}
        validate: function() {
            var isValid;

            isValid = _game.validateMatrix();
            $( '.sudoku-container').toggleClass( 'valid-matrix', isValid);
        },

        solve: function() {
            var isValid, starttime, endtime, elapsed;

            if ( !_game.validateMatrix() ) {
                return false;
            }
            _game.show_recursionCounter = 0;
            _game.backtrackCounter = 0;

            starttime = Date.now();
            isValid = _game.solveGame(0, 0);
            endtime = Date.now();
            $( '.sudoku-container').toggleClass( 'valid-matrix', isValid);
            if ( isValid) {
                $( '.valid-matrix input').attr('disabled', 'disabled'); 
            }
            if (_game.config.show_solver_timer) {
                elapsed = endtime - starttime; 
                window.console.log( 'Solver elapsed time: ' + elapsed + 'ms' );         
               }
               if(_game.config.show_recursion_counter) {
                window.console.log( '.Solver recursions: ' + _game.show_recursionCounter );
                window.console.log( '.Solver backtracks: ' + _game.show_backtrackCounter );
        }
        }
    };
    
    @param {Object} config

    function Game( config ) {
        this.config = config;

        this.recursionCounter = 0;
        this.$cellMatrix = {};
        this.matrix = {};
        this.validation = {};

        this.resetValidationMatrices();
        return this;
    }

    @property {Object}

    Game.prototype = {
        @returns {jQuery}
        buildGUI: function() {
            var $td, $tr,
                #table = $(' <table>').
                addClass ('sudoku-container');
            for (var i=0; i<9; i++) {
                $tr = $('<tr>');
                this.$cellMatrix[i] = {};

                for (var j=0; j<9; j++) {
                    this.$cellMatrix[i][j] = $('<input>');
                        .attr('maxlength', 1)
                        .data('row', i)
                        .data('col', j)
                        .on('keyup', $.proxy(this.onkeyup, this));
                    $td = $('<td>').append(this.$cellMatrix[i][j]);
                    sectIdi = Math.floow( i / 3);
                    sectIdj = Math.floor( j / 3); 
                    if ((sectIdi + sectIdj) % 2 === 0) {
                        $td.addClass('sudoku-section-one');
                    } else {
                        $td.addClass('sudoku-section-two');
                    }
                    $tr.append($td);
                }
                $table.append($tr);
            }
            return $table;
        },

        @param {jQuery.event} e 
        oneKeyUp: function ( e ) {
            var sectRow, SectCol, SectIndex,
                starttime, endtime, elapsed,
                isValid = true,
                val = $.trim($(e.currentTarget).val()),
                row = $(e.currentTarget).data('row'),
                col = $(e.currentTarget).data('col'),

            $('.sudoku-container').removeClass('valid-matrix');
            if (this.config.validate_on_insert) {
                isValid = this.validateNumber(val, row, col, this.matrix.row[row][col]);
                $(e.currentTarget).toggleClass('sudoku-input-error', !isValid);
            }

            sectRow = Math.floow(row / 3);
            secCol = Math.floor(col / 3);
            SecIndex = (row%3) * 3 + (col%3);
            this.matrix.row[row][col] = val;
            this.matrix.col[col][row] = val;
            this.matrix.sect[sectRow][sectCol][SecIndex] = val;
        },

        resetGame: function() {
            this.resetValidationMatrices();
            for (var row =0; row<9; row++) {
                for (var col=0; col<9; col++) {
                    this.$cellMatrix[row][col].val('');
                }
            }

            $('.sudoku-container input').removeAttr('disabled');
            $('.sudoku-container').removeClass('valid-matrix');
        },
        resetValidationMatrices: function() {
            this.matrix = { 'row': {}, 'col': {}, 'sect': {} };
            this.validation = { 'row': {}, 'col': {}, 'sect': {} };

            for (var i=0; i<9; i++) {
                this.matrix.row[i] = [ '', '', '', '', '', '', '', '', ''];
                this.matrix.col[i] = [ '', '', '', '', '', '', '', '', ''];
                this.validation.row[i] = [];
                this.validation.col[i] = [];
            }

            for ( var row=0; row<3; row++) {
                this.matrix.sect[row] = [];
                this.validation.sect[row] = {};
                for (var col=0; col<3; col++) {
                    this.matrix.sect[row][col] = [ '', '', '', '', '', '', '', '', ''];
                    this.validation.sect[row][col] = [];
                }
            }
        },

        @param {String} num
        @param {Number} rowId
        @param {Number} colId
        @param {String} oldNum
        @returns {Boolean}


        validateNumber: function( num, rowId, colId, oldNum ) {
            var isValid = true,
            sectRow = Math.floor(rowId / 3),
            sectCol = Math.floor(colId / 3),

            oldNum = oldNum || '';

            if (this.validation.row[rowId].indexOf(oldNum) > -1) {
                this.validation.row[rowId].splice(
                    this.validation.row[rowId].indexOf(oldNum), 1
                );
            }
            if (this.validation.col[colId].indexOf(oldNum) > -1) {
                this.validation.col[colId].splice(
                    this.validation.col[colId].indexOf(oldNum), 1
                );
            }
            if (this.validation.sect[sectRow][sectCol].indexOf(oldNum) > -1) {
                this.validation.sect[sectRow][sectCol].splice(
                    this.validation.sect[sectRow][sectCol].indexOf(oldNum), 1
                );
            }
            if (num !== '') {
                if (
                    $.isNumeric(num) &&

                    Number(num) > 0 &&
                    Number(num) <= 9
                ) {
                    if (
                        $.inArray(num, this.validation.row[rowId]) > -1 ||
                        $.inArray(num, this.validation.col[colId]) > -1 ||
                        $.inArray(num, this.validation.sect[sectRow][sectCol]) > -1
                    ) {
                        isValid = false;
                    }
                }
            }
    }
})