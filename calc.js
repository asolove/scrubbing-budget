(function(){
"use strict";

var vars = {};
var revenue = vars.revenue = new c.Variable({ name: "revenue", value: 3464 });
var outlays = vars.outlays = new c.Variable({ name: "outlays", value: 3464 });
var balance = vars.balance = new c.Variable({ name: "balance" });

var taxRates = [10, 15, 25, 28, 33, 35, 39.6];
// FIXME: real numbers
var dollarsInBracket = [2, 4, 6, 8, 10, 20, 50];

taxRates.forEach(function(rate, i){
	vars["tax-bracket-"+i] = new c.Variable({ name: "tax-bracket-"+i, value: rate });
})


var constraints = [
	new c.Equation(c.minus(revenue, outlays), balance, c.Strength.required, 0),
	new c.Inequality(revenue, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(outlays, c.GEQ, 0, c.Strength.required, 0),
	new c.StayConstraint(outlays, c.Strength.medium, 0)
];

var taxRevenue = new c.Expression(0);
taxRates.forEach(function(rate, i){
	var rate = vars["tax-bracket-"+i];
	var nextRate = vars["tax-bracket-"+(i+1)] || 100;
	console.log(rate.value, nextRate.value || nextRate);

	constraints.splice(0,0,
		new c.Inequality(rate, c.LEQ, nextRate, c.Strength.required, 0),
		new c.Inequality(rate, c.GEQ, 0, c.Strength.required, 0),
		new c.StayConstraint(rate, c.Strength.medium, 0)
	);

	taxRevenue = (new c.Expression(rate)).times(dollarsInBracket[i]).plus(taxRevenue);
});

constraints.push(
	new c.Equation(taxRevenue, vars.revenue, c.Strength.required, 0)
);

var s = c.extend(new c.SimplexSolver(), {
	onsolved: function(){
		render();
	}
});

constraints.forEach(function(c){ s.addConstraint(c); });
s.resolve();


var views = document.querySelectorAll("[data-variable]");
var viewForVar = {};
_.forEach(views, function(el){
	viewForVar[el.dataset.variable] = el;
});

function attachControls(){
	var moving;
	var startX;
	var startVal; 
	var budget = document.getElementById("budget");

	budget.addEventListener("mousedown", function(e){
		var varName = e.target.dataset.variable;
		var variable = vars[varName];
		if(!variable) return;
		moving = variable;
		startX = e.screenX;
		startVal = variable.value;
		s.addEditVar(variable, c.Strength.high).beginEdit();
	});

	budget.addEventListener("dblclick", function(e){
		var varName = e.target.dataset.variable;
		var variable = vars[varName];
		if(!variable) return;
		if(variable.strongStay){
			s.removeConstraint(variable.strongStay);
			variable.strongStay = false;
		} else {
			variable.strongStay = new c.StayConstraint(variable, c.Strength.required, variable.value);
			s.addConstraint(variable.strongStay);
		}
		e.target.classList.toggle("locked");
	});

	budget.addEventListener("mousemove", function(e){
		if(!moving) return;
		s.suggestValue(moving, startVal + e.screenX - startX).resolve();
	});

	budget.addEventListener("mouseup", function(e){
		moving = null;
		s.endEdit();
	});

}

var formatters = {
	percent: function(v){
		return (v).toFixed(0) + "%";
	},

	dollars: function(v){
		return "$" + (v.toFixed(2));
	}
};

var id = function(a){ return a; };

function render(){
	_.each(viewForVar, function(el, varName){
		var variable = vars[varName];
		el.innerHTML = (formatters[el.dataset.format]||id)(variable.value);
	});
}

render();
attachControls();


})();