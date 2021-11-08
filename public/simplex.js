const COST_ROW = 0;
const VARIABLES_ROW = 1;
const Z_ROW = 2;
const FIRST_RESTRICTION_ROW = 3;
const FIRST_COEFFICIENT_COLUMN = 1;
const BASE_VARIABLES_COLUMN = 0;
const SURPLUS_VARIABLE_INITIAL_RESTRICTION_COEFFICIENT_VALUE = +1; // <= restriction (folga)
const SLACK_VARIABLE_INITIAL_RESTRICTION_COEFFICIENT_VALUE = -1; // >= restriction (excesso)
const ARTIFICIAL_VARIABLE_INITIAL_RESTRICTION_COEFFICIENT_VALUE = +1; //>=,= restrictions (artificial)


Simplex = function (d, c, a, o, b){
    this.problem = {
        d:d,
        c:c,
        a:a,
        o:o,
        b:b
    }
    this.standardFormProblem = null;
    this.steps = new Array();
    this.finished = false;

    this.totalSurplusVariables = 0;
    this.totalSlackVariables = 0;
    this.totalArtificialVariables = 0;

    return this;
};

Simplex.prototype.nextStep = function(){
    let step = new Simplex.Step(this);

    return step;
}


const GOAL_PROBLEM_INTERPRETATION = 'PROBLEM_INTERPRETATION';
const GOAL_STANDARD_FORM_CONVERTION = 'STANDARD_FORM_CONVERTION';
const GOAL_ITERACTION_OF_SIMPLEX_METHOD = 'ITERATION_OF_SIMPLEX_METHOD';
const GOAL_INITIAL_TABLE_FOR_TWO_PHASES_METHOD = 'INITIAL_TABLE_FOR_TWO_PHASES_METHOD'
const GOAL_ITERATION_OF_PHASE_ONE_OF_TWO_PHASES_METHOD = 'ITERATION_OF_PHASE_ONE_OF_TWO_PHASES_METHOD'
const GOAL_TABLE_PREPARATION_FOR_PHASE_TWO_OF_TWO_PHASES_METHOD = 'TABLE_PREPARATION_FOR_PHASE_TWO_OF_TWO_PHASES_METHOD';
const GOAL_ITERATION_OF_PHASE_TWO_OF_TWO_PHASES_METHOD = 'ITERATION_OF_PHASE_TWO_OF_TWO_PHASES_METHOD';

Simplex.Step = function(simplex){
    simplex.steps.push(this);
    this.index = simplex.steps.length - 1;
    this.simplex = simplex;
    this.steps = new Array();
    this.matrix = null;
    this.finished = false;
    this.goal = null;
    this.simplex.twoPhasesMethod = this.simplex.totalArtificialVariables > 0;
    if(simplex.steps.length == 1){
        this.goal = GOAL_PROBLEM_INTERPRETATION;
        this.matrix = this.matrixFromProblem(this.simplex.problem);
    } else if(simplex.steps.length == 2){
        this.goal = GOAL_STANDARD_FORM_CONVERTION;
        this.simplex.convertProblemToStandardForm(this);
        this.matrix = this.matrixFromProblem(this.simplex.standardFormProblem);
    } else if(simplex.steps.length == 3 && this.simplex.twoPhasesMethod == true){
        this.goal = GOAL_INITIAL_TABLE_FOR_TWO_PHASES_METHOD;
        this.twoPhasesIteraction();
        return;
    } else {
        let previousStep = this.simplex.steps[this.simplex.steps.length -2];
        if(previousStep.goal == GOAL_INITIAL_TABLE_FOR_TWO_PHASES_METHOD){
            this.goal = GOAL_ITERATION_OF_PHASE_ONE_OF_TWO_PHASES_METHOD;
            this.simplexIteraction();
        } else if(previousStep.goal == GOAL_ITERATION_OF_PHASE_ONE_OF_TWO_PHASES_METHOD && previousStep.finished == false){
            this.goal = GOAL_ITERATION_OF_PHASE_ONE_OF_TWO_PHASES_METHOD;
            this.simplexIteraction();
        } else if(previousStep.goal == GOAL_ITERATION_OF_PHASE_ONE_OF_TWO_PHASES_METHOD && previousStep.finished == true){
            this.goal = GOAL_TABLE_PREPARATION_FOR_PHASE_TWO_OF_TWO_PHASES_METHOD;
            this.preparePhaseTwoOfTwoPhasesMethod();
            return;
        } else if(previousStep.goal == GOAL_TABLE_PREPARATION_FOR_PHASE_TWO_OF_TWO_PHASES_METHOD){
            this.goal = GOAL_ITERATION_OF_PHASE_TWO_OF_TWO_PHASES_METHOD;
            this.simplexIteraction();
        } else if(previousStep.goal == GOAL_ITERATION_OF_PHASE_TWO_OF_TWO_PHASES_METHOD && previousStep.finished == false){
            this.goal = GOAL_ITERATION_OF_PHASE_TWO_OF_TWO_PHASES_METHOD;
            this.simplexIteraction();
        } else if(this.simplex.twoPhasesMethod == false){
            this.goal = GOAL_ITERACTION_OF_SIMPLEX_METHOD;
            this.simplexIteraction();
        } else {
            throw 'Unsupported operation exception';
        }
        
    }


    if(simplex.steps.length == 1){
        return this;
    } else if(simplex.steps.length == 2 && this.simplex.twoPhasesMethod){
        return this;
    }

    this.evaluateStoppingCriteria();
    if(this.stoppingCriteria.stop == true){
        this.finished = true;
        this.simplex.finished = true;
        this.steps.push('Finished: ' + this.stoppingCriteria.reason); 
    } else {
        this.steps.push('Another iteration is required: ' + this.stoppingCriteria.reason);
        if(this.simplex.totalArtificialVariables > 0) {
            this.steps.push('There ' + (this.simplex.totalArtificialVariables == 1 ? 'is': 'are') + ' ' + this.simplex.totalArtificialVariables + ' artificial variables, two phases method is required');
        } else {
            this.steps.push('There is no one artificial variable, the simplex method is required');
        }
    }
    
    return this;
}

Simplex.Step.prototype.evaluateStoppingCriteria = function(){
    if(this.goal == GOAL_ITERACTION_OF_SIMPLEX_METHOD || this.goal == GOAL_ITERATION_OF_PHASE_TWO_OF_TWO_PHASES_METHOD){
        if(this.allPivotColumnValuesLessOrEqualZero == true){
            this.stoppingCriteria = {stop:true, reason:'Column of variable that enters to base (pivot column) has all elements negative or equal to zero: Ilimited solution'};
            this.finished = true;
            return;
        }
    }
    for(let i = 1; i < this.matrix[Z_ROW].length - 2; i++){
        if(this.matrix[Z_ROW][i] < 0){
            this.stoppingCriteria = {stop: false, reason: 'c' + i + '=' + this.matrix[Z_ROW][i] + ' is negative'};
            this.finished = false;
            return;
        }
    }

    for(let column = FIRST_COEFFICIENT_COLUMN; column < this.matrix[VARIABLES_ROW].length -2; column++){
        let isBasicVariable = false;
        for(let baseVariableIndex = 0; baseVariableIndex < this.base.length; baseVariableIndex++){
            if(column == this.base[baseVariableIndex]){
                isBasicVariable = true;
                break;       
            }
        }
        if(isBasicVariable){
            continue;
        }
        if(this.matrix[Z_ROW][column] == 0){
            if(this.goal == GOAL_ITERACTION_OF_SIMPLEX_METHOD){
                this.stoppingCriteria = {stop: true, reason: 'The coefficient of the non basic variable ' + this.matrix[VARIABLES_ROW][column] + ' is ZERO. There are infinite solutions.'};
            } else if (this.goal == GOAL_ITERATION_OF_PHASE_ONE_OF_TWO_PHASES_METHOD){
                this.stoppingCriteria = {stop: false, reason: 'The coefficient of the non basic variable ' + this.matrix[VARIABLES_ROW][column] + ' is ZERO. There are infinite solutions.'};
                this.finished = true;
            }
            return;
        }
    }

    this.simplex.solution = {};
    for(let i = 1; i < this.matrix[VARIABLES_ROW].length - 2; i++){
        this.simplex.solution[this.matrix[VARIABLES_ROW][i]] = 0;
    }
    for(let i = 2; i < this.matrix.length; i++){
        this.simplex.solution[this.matrix[i][BASE_VARIABLES_COLUMN]] = this.matrix[i][this.matrix[i].length - 1];
    }

    if(this.simplex.problem.d == 'min'){
        this.simplex.solution['z'] = this.matrix[Z_ROW][this.matrix[VARIABLES_ROW].length - 1] * (-1);
    } else {
        this.simplex.solution['z'] = this.matrix[Z_ROW][this.matrix[VARIABLES_ROW].length - 1];
    }

    for(let key in this.simplex.solution){
        this.steps.push(key + '=' + this.simplex.solution[key]);
    }

    this.stoppingCriteria = {stop: true, reason: 'There is no cost coefficient less than zero'};
}


Simplex.Step.prototype.matrixFromProblem = function(problem){
    this.base = [];
    let matrix = new Array(problem.a.length + 3);
    for(let row = 0; row < matrix.length; row++){
        matrix[row] = new Array(problem.c.length + 3);

        for(let column = 0; column < matrix[row].length; column++){
            if(row == COST_ROW){
                if(column == BASE_VARIABLES_COLUMN){
                    matrix[row][column] = 'cost';
                } else if (column < matrix[row].length - 2) {
                    matrix[row][column] = problem.c[column - 1]
                } else {
                    matrix[row][column] = '';
                }
            } else if(row == VARIABLES_ROW){
                if(column == BASE_VARIABLES_COLUMN){
                    matrix[row][column] = problem.d;
                } else if (column < matrix[row].length - 2) {
                    matrix[row][column] = 'x' + column
                } else {
                    matrix[row][column] = '';
                }
            } else if (row == Z_ROW){
                if(column == BASE_VARIABLES_COLUMN){
                    matrix[Z_ROW][column] = 'z';
                } else if (column < matrix[Z_ROW].length - 2) {
                    matrix[Z_ROW][column] = problem.c[column - 1] *(-1);
                } else if (column == matrix[Z_ROW].length - 2) {
                    matrix[Z_ROW][column] = '=';
                } else if (column == matrix[Z_ROW].length - 1) {
                    matrix[Z_ROW][column] = +0;
                }
            } else {
                if(column == BASE_VARIABLES_COLUMN){
                    // do nothing.
                } else if(column > 0 && column < matrix[row].length - 2){
                    matrix[row][column] = problem.a[row - 3][column - 1];
                } else if(column == matrix[row].length - 2){
                    matrix[row][column] = problem.o[row - 3];
                } else if(column == matrix[row].length - 1){
                    matrix[row][column] = problem.b[row - 3];
                }
            }
        }
    }
    this.defineBase(matrix);
    return matrix;
}

Simplex.Step.prototype.defineBase = function(matrix){
    let restrictionsQuantity = matrix.length - FIRST_RESTRICTION_ROW;

    for(let column = matrix[VARIABLES_ROW].length - 3; column > matrix[VARIABLES_ROW].length - 378 - restrictionsQuantity; column--){
        let ones = 0;
        let zeros = 0;
        let oneRow = -1;
        for(let row = FIRST_RESTRICTION_ROW; row < matrix.length; row++){
            if(matrix[row][column] == 1){
                ones++;
                oneRow = row;
            } else if(matrix[row][column] == 0){
                zeros++;
            }
        }
        if(oneRow > -1 && ones == 1 && (zeros + ones) == restrictionsQuantity){
            matrix[oneRow][BASE_VARIABLES_COLUMN] = matrix[VARIABLES_ROW][column];
            this.base.push(column);
        }
    }
}


Simplex.prototype.convertProblemToStandardForm = function(step){
    this.standardFormProblem = {
        d: 'max',
        c: (problem.d == 'max' ? problem.c.map(x => x): problem.c.map(x => -x)),
        a: problem.a.map(x => x.map(y => y)),
        o: problem.o.map(x => x),
        b: problem.b.map(x => x)
    };


    this.totalSlackVariables = this.addExtraVariableToStandardFormProblem('>=', SLACK_VARIABLE_INITIAL_RESTRICTION_COEFFICIENT_VALUE)
    this.totalSurplusVariables = this.addExtraVariableToStandardFormProblem('<=', SURPLUS_VARIABLE_INITIAL_RESTRICTION_COEFFICIENT_VALUE)
    this.totalArtificialVariables = this.addExtraVariableToStandardFormProblem('>=', ARTIFICIAL_VARIABLE_INITIAL_RESTRICTION_COEFFICIENT_VALUE)
    this.totalArtificialVariables += this.addExtraVariableToStandardFormProblem('=', ARTIFICIAL_VARIABLE_INITIAL_RESTRICTION_COEFFICIENT_VALUE)

    for(let i = 0; i < this.standardFormProblem.o.length; i++){
        this.standardFormProblem.o[i] = '=';
    }

    if(this.totalArtificialVariables > 0){
        this.twoPhasesMethod = true;
    }
}

Simplex.prototype.addExtraVariableToStandardFormProblem = function(operator, value){
    let restrictionIndexes = [];
    for(let i = 0; i < this.standardFormProblem.o.length; i++){
        if(this.standardFormProblem.o[i] == operator){
            restrictionIndexes.push(i);
        }
    }

    for(let restrictionOperatorIndex = 0; restrictionOperatorIndex < restrictionIndexes.length; restrictionOperatorIndex++){
        
        let restrictionIndex = restrictionIndexes[restrictionOperatorIndex];

        this.standardFormProblem.c.push(0);
        for(let i = 0; i < this.standardFormProblem.a.length; i++){
            if(i == restrictionIndex){
                this.standardFormProblem.a[restrictionIndex].push(value);
            } else {
                this.standardFormProblem.a[i].push(0);
            }
        }
    }
    return restrictionIndexes.length;
}





Simplex.Step.prototype.toHTML = function (){
    let stepContainer = document.createElement('div');

    let h1 = document.createElement('h1');
    h1.innerHTML = (this.index + 1) + ' - ' + this.goal;
    stepContainer.appendChild(h1);

    let orderedList = document.createElement('ol');
    for(let i = 0; i < this.steps.length; i++){
        let li = document.createElement('li');
        li.innerHTML = this.steps[i];
        orderedList.appendChild(li);
    }

    stepContainer.appendChild(orderedList);


    let table = document.createElement('TABLE');
    table.border = '1px';
    let body = table.createTBody();
    for(let i = 0; i < this.matrix.length; i++){
        let row = body.insertRow();
        for(let j = 0; j < this.matrix[i].length; j++){
            let cell = row.insertCell();
            cell.innerHTML = this.matrix[i][j];
        }
    }

    stepContainer.appendChild(table);
    return stepContainer;
}



Simplex.prototype.pivotColumn = function(){
    let previousStep = this.steps[this.steps.length - 2];
    let previousMatrix = previousStep.matrix;
    let smallestValue = 1;
    let smallestValueIndex = -1;
    for(let i = FIRST_COEFFICIENT_COLUMN; i < previousStep.matrix[VARIABLES_ROW].length - 2; i++){
        let alreadyPartOfBase = false;
        for(let j = 0; j < previousStep.base.length; j++){
            if (i == previousStep.base[j]){
                alreadyPartOfBase = true;
                break;
            }
        }
        if(alreadyPartOfBase){
            continue;
        }
        if(previousMatrix[Z_ROW][i] < smallestValue){
            smallestValue = previousMatrix[Z_ROW][i];
            smallestValueIndex = i;
        }
    }
    return smallestValueIndex;
}

Simplex.prototype.pivotRow = function(pivotColumn){
    let step = this.steps[this.steps.length - 1];
    let previousStep = this.steps[this.steps.length - 2];
    let previousMatrix = previousStep.matrix;
    let bColumn = previousMatrix[VARIABLES_ROW].length - 1;

    step.allPivotColumnValuesLessOrEqualZero = true;
    let smallestValue = 1e16;
    let smallestValueIndex = -1;
    for(let i = FIRST_RESTRICTION_ROW; i < previousMatrix.length; i++){
        if(previousMatrix[i][pivotColumn] <= 0){
            continue;
        }
        step.allPivotColumnValuesLessOrEqualZero = false;
        let value = previousMatrix[i][bColumn] / previousMatrix[i][pivotColumn]
        if(value <= smallestValue || smallestValueIndex == -1){
            smallestValue = value;
            smallestValueIndex = i;
        }
    }

    return smallestValueIndex;
}

Simplex.prototype.createMatrixToLastStep = function(){
    const previousMatrix = this.steps[this.steps.length - 2].matrix;
    this.steps[this.steps.length - 1].matrix = new Array(previousMatrix.length);
    let matrix = this.steps[this.steps.length - 1].matrix;

    for(let row = 0; row < previousMatrix.length; row++){
        matrix[row] = new Array(previousMatrix[row].length);
        for(let column = 0; column < previousMatrix[row].length; column++){

            if(row == COST_ROW || row == VARIABLES_ROW || column == BASE_VARIABLES_COLUMN || column == previousMatrix[row].length - 2){
                
                matrix[row][column] = previousMatrix[row][column];
            }
        }
    }
}

Simplex.Step.prototype.twoPhasesIteraction = function(){
    this.steps.push('Create initial table for two phases method');

    let previousStep = this.simplex.steps[this.simplex.steps.length - 2];
    const previousMatrix = previousStep.matrix;
    this.matrix = new Array(previousMatrix.length);
    for(let i = 0; i < previousMatrix.length; i++){
        this.matrix[i] = new Array(previousMatrix[i].length);
        for(let j = 0; j < previousMatrix[i].length; j++){
            this.matrix[i][j] = previousMatrix[i][j];
        }        
    }

    let artificialVariableColumns = [];
    let artificialVariableNames = [];
    for(let column = previousMatrix[VARIABLES_ROW].length - 2 - this.simplex.totalArtificialVariables; column < previousMatrix[VARIABLES_ROW].length - 2; column++){
        artificialVariableColumns.push(column);
        artificialVariableNames.push(previousMatrix[VARIABLES_ROW][column]);
    }
    
    let message = 'Artificial variables ' + artificialVariableNames.join(', ');
    this.steps.push(message);

    for(let column = 1; column < this.matrix[Z_ROW].length - 2; column++){
        let artificialVariableColumn = false;
        for(let j = 0; j < artificialVariableColumns.length; j++){
            if(column == artificialVariableColumns[j]){
                artificialVariableColumn = true;
                break;
            }
        }
        if(artificialVariableColumn){
            this.matrix[COST_ROW][column] = -1;
        } else {
            this.matrix[COST_ROW][column] = 0;
        }
    }

    this.calculateZRowForTwoPhaseMatrix();

    this.base = previousStep.base.map(x => x);
}

Simplex.Step.prototype.calculateZRowForTwoPhaseMatrix = function(){
    const COEFFICIENT_COLUMN = this.matrix[VARIABLES_ROW].length - 2;

    for(let column = FIRST_COEFFICIENT_COLUMN; column < this.matrix[VARIABLES_ROW].length; column++){
        if(column == COEFFICIENT_COLUMN){
            continue;
        }
        let zj = 0;
        for(let row = FIRST_RESTRICTION_ROW; row < this.matrix.length; row++){
            let baseVariable = this.matrix[row][BASE_VARIABLES_COLUMN];
            for(let column_2 = FIRST_COEFFICIENT_COLUMN; column_2 < this.matrix[VARIABLES_ROW].length; column_2++){
                if(this.matrix[VARIABLES_ROW][column_2] == baseVariable){
                    let cbi = this.matrix[COST_ROW][column_2];
                    zj += cbi * this.matrix[row][column];
                }
            }
        }
        let cj = this.matrix[COST_ROW][column];
        zj = zj - cj;
        if((zj > 0 && zj < 1e-10) || (zj < 0 && zj > -1e-10)){
            zj = 0;
        }
        this.matrix[Z_ROW][column] = zj;
    }
}

Simplex.Step.prototype.preparePhaseTwoOfTwoPhasesMethod = function(){
    let previousStep = this.simplex.steps[this.simplex.steps.length - 2];
    let previousMatrix = previousStep.matrix;
    this.matrix = new Array(previousMatrix.length);
    for(let row = 0; row < previousMatrix.length; row++){
        this.matrix[row] = new Array(previousMatrix[row].length - this.simplex.totalArtificialVariables);
        for(let column = 0; column < previousMatrix[row].length - 2 - this.simplex.totalArtificialVariables; column++){
            this.matrix[row][column] = previousMatrix[row][column];
        }
        this.matrix[row][this.matrix[row].length - 2] = previousMatrix[row][previousMatrix[row].length - 2];
        this.matrix[row][this.matrix[row].length - 1] = previousMatrix[row][previousMatrix[row].length - 1];
    }

    for(let i = 0; i < this.simplex.problem.c.length; i++){
        this.matrix[COST_ROW][FIRST_COEFFICIENT_COLUMN + i] = this.simplex.problem.c[i] * (this.simplex.problem.d == 'min' ? -1: 1);
    }

    this.base = previousStep.base.map(x => x);
    this.calculateZRowForTwoPhaseMatrix();
}

Simplex.Step.prototype.simplexIteraction = function(){
    this.steps.push('Aplying simplex method');

    this.simplex.createMatrixToLastStep();
    const previousStep = this.simplex.steps[this.simplex.steps.length - 2];
    const previousMatrix = previousStep.matrix;

    const pivotColumn = this.simplex.pivotColumn();
    this.steps.push('Pivot column (enters base): ' + pivotColumn + ' = ' + previousMatrix[VARIABLES_ROW][pivotColumn]);

    const pivotRow = this.simplex.pivotRow(pivotColumn);
    if(pivotRow == -1){
        return;
    }
    this.steps.push('Pivot row (leaves base): ' + pivotRow + ' = ' + previousMatrix[pivotRow][BASE_VARIABLES_COLUMN]);


    const pivotValue = previousMatrix[pivotRow][pivotColumn];
    this.steps.push('Pivot value: ' + pivotValue);

    for(let row = Z_ROW; row < previousMatrix.length; row++){
        for(let column = 1; column < previousMatrix[row].length; column++){
            if(column == previousMatrix[row].length - 2){
                continue;
            }
            if(row == pivotRow){
                this.matrix[row][BASE_VARIABLES_COLUMN] = previousMatrix[VARIABLES_ROW][pivotColumn];
                
                this.matrix[row][column] = previousMatrix[pivotRow][column] / pivotValue;
            } else {
                this.matrix[row][column] = previousMatrix[row][column] - (previousMatrix[row][pivotColumn] * (previousMatrix[pivotRow][column] / pivotValue));
            }
            if((this.matrix[row][column] > 0 && this.matrix[row][column] < 1e-10) || (this.matrix[row][column] < 0 && this.matrix[row][column] > -1e-10)){
                this.matrix[row][column] = 0;
            }
        }
    }

    this.base = [];
    for(let column = 1; column < this.matrix[VARIABLES_ROW].length - 2; column++){
        for(let row = FIRST_RESTRICTION_ROW; row < this.matrix.length; row++){
            if(this.matrix[row][BASE_VARIABLES_COLUMN] == this.matrix[VARIABLES_ROW][column]){
                this.base.push(column);
            }
        }
    }
}
