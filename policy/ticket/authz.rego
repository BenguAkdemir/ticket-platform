package ticket.authz

default route_allowed := false

route_allowed if {
	"requester" in input.subject.roles
	input.action in {"ticket:open", "ticket:submit", "ticket:read"}
}

route_allowed if {
	"reviewer" in input.subject.roles
	input.action in {"ticket:approve", "ticket:reject", "ticket:read"}
}

default allowed := false

allowed if {
	input.action == "ticket:submit"
	input.subject.id == input.resource.openedBy
}

allowed if {
	"reviewer" in input.subject.roles
	input.subject.id != input.resource.openedBy
	input.action in {"ticket:approve", "ticket:reject"}
}

allowed if {
	input.action == "ticket:read"
	input.subject.id == input.resource.openedBy
}

allowed if {
	input.action == "ticket:read"
	input.resource.openedBy
	"reviewer" in input.subject.roles
}
