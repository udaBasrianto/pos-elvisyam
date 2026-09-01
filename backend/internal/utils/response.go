package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RespondJSON(c *gin.Context, status int, data interface{}) {
	c.JSON(status, data)
}

func RespondSuccess(c *gin.Context, message string, data interface{}) {
	if data == nil {
		c.JSON(http.StatusOK, gin.H{
			"message": message,
		})
		return
	}
	c.JSON(http.StatusOK, data)
}

func RespondError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{
		"error": message,
	})
}

func RespondValidationError(c *gin.Context, message string) {
	c.JSON(http.StatusBadRequest, gin.H{
		"error": message,
	})
}

func RespondNotFound(c *gin.Context, message string) {
	c.JSON(http.StatusNotFound, gin.H{
		"error": message,
	})
}
