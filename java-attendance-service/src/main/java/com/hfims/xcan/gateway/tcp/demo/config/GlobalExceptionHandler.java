package com.hfims.xcan.gateway.tcp.demo.config;

import com.hfims.xcan.gateway.tcp.demo.support.BaseResult;
import com.hfims.xcan.gateway.tcp.demo.support.ResultWrapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<BaseResult> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        System.err.println("❌ JSON Parsing Error: " + ex.getMessage());
        ex.printStackTrace();
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ResultWrapper.wrapFailure("400", "Invalid JSON format: " + ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<BaseResult> handleValidationExceptions(MethodArgumentNotValidException ex) {
        System.err.println("❌ Validation Error: " + ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ResultWrapper.wrapFailure("400", "Validation failed: " + ex.getMessage()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<BaseResult> handleMissingParams(MissingServletRequestParameterException ex) {
        System.err.println("❌ Missing Parameter: " + ex.getParameterName());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ResultWrapper.wrapFailure("400", "Missing required parameter: " + ex.getParameterName()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<BaseResult> handleIllegalArgument(IllegalArgumentException ex) {
        System.err.println("❌ Illegal Argument: " + ex.getMessage());
        ex.printStackTrace();
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ResultWrapper.wrapFailure("400", "Invalid argument: " + ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<BaseResult> handleGenericException(Exception ex) {
        System.err.println("❌ Unexpected Error: " + ex.getClass().getName() + " - " + ex.getMessage());
        ex.printStackTrace();
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ResultWrapper.wrapFailure("500", "Internal server error: " + ex.getMessage()));
    }
}
