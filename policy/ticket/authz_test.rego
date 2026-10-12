package ticket.authz_test

import data.ticket.authz

test_empty_input_is_denied if {
	authz.route_allowed == false with input as {}
}