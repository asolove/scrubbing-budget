(function(){
"use strict";

var vars = {};
var revenues = vars.revenues = new c.Variable({ name: "revenues", value: 3464 });
var spending = vars.spending = new c.Variable({ name: "spending", value: 3464 });
var surplus = vars.surplus = new c.Variable({ name: "surplus" });
var deficit = vars.deficit = new c.Variable({ name: "deficit" });


var taxRates = [10, 15, 25, 28, 33, 35, 39.6];
// FIXME: real numbers
var dollarsInBracket = [2, 4, 6, 8, 10, 20, 50];

taxRates.forEach(function(rate, i){
	vars["tax-bracket-"+i] = new c.Variable({ name: "tax-bracket-"+i, value: rate });
})


var constraints = [
	new c.Equation(c.minus(revenues, spending), surplus, c.Strength.required, 0),
	new c.Equation(c.minus(0, surplus), deficit, c.Strength.required, 0),
	new c.Inequality(revenues, c.GEQ, 0, c.Strength.required, 0),
	new c.Inequality(spending, c.GEQ, 0, c.Strength.required, 0),
	new c.StayConstraint(spending, c.Strength.medium, 0)
];

var taxRevenue = new c.Expression(0);
taxRates.forEach(function(rate, i){
	var rate = vars["tax-bracket-"+i];
	var nextRate = vars["tax-bracket-"+(i+1)] || 100;

	constraints.splice(0,0,
		new c.Inequality(rate, c.LEQ, nextRate, c.Strength.required, 0),
		new c.Inequality(rate, c.GEQ, 0, c.Strength.required, 0),
		new c.StayConstraint(rate, c.Strength.medium, 0)
	);

	taxRevenue = (new c.Expression(rate)).times(dollarsInBracket[i]).plus(taxRevenue);
});

constraints.push(
	new c.Equation(taxRevenue, revenues, c.Strength.required, 0)
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

var scales = {
	overview: .1
};

function scale(el, val){
	return val * (scales[el.dataset.scale] || 1);
}

function unscale(el, val){
	return val / (scales[el.dataset.scale] || 1);
}

function attachControls(){
	var moving;
	var startX;
	var startVal; 

	document.body.addEventListener("mousedown", function(e){
		var varName = e.target.dataset.variable;
		var variable = vars[varName];
		if(!variable) return;
		moving = variable;
		startX = e.screenX;
		startVal = variable.value;
		if(variable.strongStay) s.removeConstraint(variable.strongStay);
		s.addEditVar(variable, c.Strength.high).beginEdit();
	});

	document.body.addEventListener("dblclick", function(e){
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

	document.body.addEventListener("mousemove", function(e){
		if(!moving) return;
		var newValue = startVal + unscale(viewForVar[moving.name], e.screenX - startX);
		s.suggestValue(moving, newValue).resolve();
	});

	document.body.addEventListener("mouseup", function(e){
		if(!moving) return;

		s.endEdit();
		if(moving.strongStay) s.addConstraint(moving.strongStay);
		moving = null;
	});

}

var formatters = {
	bar: function(el, variable){
		el.style.width = scale(el, variable.value) + "px";
	},

	percent: function(el, variable){
		el.innerHTML = (variable.value).toFixed(0) + "%";
	},

	dollars: function(el, variable){
		el.innerHTML = "$" + (variable.value.toFixed(2));
	}
};

var id = function(a){ return a; };

function render(){
	_.each(viewForVar, function(el, varName){
		var variable = vars[varName];
		formatters[el.dataset.format](el, variable);
	});
}

render();
attachControls();


})();