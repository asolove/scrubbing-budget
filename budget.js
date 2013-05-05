var USFederalBudget = Backbone.Model.extend({
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

var USFederalSpending = Backbone.Model.extend({
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
})