package ticket.authz_test

import data.ticket.authz

test_empty_input_is_denied if {
	authz.route_allowed == false with input as {}
}

test_requester_can_open if {
	authz.route_allowed with input as {"subject": {"id": "u1", "roles": ["requester"]}, "action": "ticket:open"}
}

test_requester_can_submit if {
	authz.route_allowed with input as {"subject": {"id": "u1", "roles": ["requester"]}, "action": "ticket:submit"}
}

test_requester_can_read if {
	authz.route_allowed with input as {"subject": {"id": "u1", "roles": ["requester"]}, "action": "ticket:read"}
}

test_requester_cannot_approve if {
	authz.route_allowed == false with input as {"subject": {"id": "u1", "roles": ["requester"]}, "action": "ticket:approve"}
}

test_requester_cannot_reject if {
	authz.route_allowed == false with input as {"subject": {"id": "u1", "roles": ["requester"]}, "action": "ticket:reject"}
}

test_requester_cannot_delete if {
	authz.route_allowed == false with input as {"subject": {"id": "u1", "roles": ["requester"]}, "action": "ticket:delete"}
}

test_reviewer_cannot_open if {
	authz.route_allowed == false with input as {"subject": {"id": "u2", "roles": ["reviewer"]}, "action": "ticket:open"}
}

test_reviewer_cannot_submit if {
	authz.route_allowed == false with input as {"subject": {"id": "u1", "roles": ["reviewer"]}, "action": "ticket:submit"}
}

test_reviewer_can_read if {
	authz.route_allowed with input as {"subject": {"id": "u1", "roles": ["reviewer"]}, "action": "ticket:read"}
}

test_reviewer_can_approve if {
	authz.route_allowed with input as {"subject": {"id": "u2", "roles": ["reviewer"]}, "action": "ticket:approve"}
}

test_reviewer_can_reject if {
	authz.route_allowed with input as {"subject": {"id": "u1", "roles": ["reviewer"]}, "action": "ticket:reject"}
}

test_no_roles_cannot_open if {
	authz.route_allowed == false with input as {"subject": {"id": "u3", "roles": []}, "action": "ticket:open"}
}
