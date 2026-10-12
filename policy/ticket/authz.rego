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
