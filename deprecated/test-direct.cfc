component accessors="true" displayname="UserService" extends="BaseService" {
    
    // Component properties
    property name="userDAO" inject="UserDAO";
    property name="logger" inject="logbox:logger:{this}";
    
    /**
     * Initialize the service
     */
    function init() {
        variables.initialized = true;
        return this;
    }
    
    /**
     * Get user by ID
     */
    function getUserById(required numeric id) {
        try {
            var user = userDAO.get(arguments.id);
            
            if (!user.isLoaded()) {
                throw(type="UserNotFound", message="User with ID #arguments.id# not found");
            }
            
            logger.info("Retrieved user: #user.getEmail()#");
            return user;
            
        } catch (any e) {
            logger.error("Error retrieving user: #e.message#", e);
            rethrow;
        }
    }
}
