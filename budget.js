var USFederalBudget = CassowaryModel.extend({
	defaults: {
		variables: {
			revenue: USFederalRevenue,
			spending: USFederalSpending,
			surplus: 0,
			deficit: 0,
		},
		constraints: {
			required: {
				"budget must balance": "revenue.total-spending.total=surplus",
				"surplus and deficit are opposites": "surplus=-deficit"
			}
		}
	}
});

var USFederalSpending = CassowaryModel.Model.extend({
	defaults: {
		variables: {
			totalSpending: {},
			socialSecurity: 725,
			medicare: 480,
			medicaid: 275,
			mandatoryOther: 545,
			defense: 700,
			nonDefense: 646,
			interest: 227
		},
		constraints: {
			required: {
				"have to pay interest": "interest=227",
				"total is the sum": "total=socialSecurity+medicare+medicaid+mandatoryOther+defense+nonDefense+interest"
			}
		}
	},

	initialize: function(){
		this.addDynamicConstraints();
	},

	addDynamicConstraints: function(){
		for(var variableName in this.variables){
			this.addConstraint(variableName+">0", variableName+">0", "required");
			if(variableName!="totalSpending") this.addStayConstraint(variableName);
		}
	}
});


/* parsing */
var operators = [">=", "<=", ">", "<", "=", "+", "-", "*"];
var operatorConstructors = {
	">=": function(a, b, strength){ return new c.Inequality(a, c.GEQ, b, strength || c.Strength.required, 0)},
	"=": function(a, b, strength){ return new c.Equation(a, b, strength || c.Strength.required, 0) }
	// .. 
};

var stringToConstraint = function(string, strength, ctx){
	var operator = operators.filter(function(op){
		return string.indexOf(op) >= 0;
	})[0];
	if(!operator) return stringToExpression(string, ctx);

	return operatorConstructors[operator](string.substr(0,i), string.substr(i+1), strength);
};

var stringToExpression = function(string, ctx){
	return string.split(".").reduce(function(part, ctx){
		return ctx.variables[part];
	}, ctx);
}






